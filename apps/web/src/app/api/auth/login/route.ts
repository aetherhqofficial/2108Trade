import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { db } from "@/lib/db";
import { users, mfaFactors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkLockout, recordFailedAttempt, resetAttempts } from "@/lib/lockout";
import { loginHistory } from "@/db/schema";

/**
 * Helper: determine if the request has MFA enabled
 */
async function isMfaEnabled(userId: string): Promise<boolean> {
  const [factor] = await db
    .select({ id: mfaFactors.id })
    .from(mfaFactors)
    .where(
      and(
        eq(mfaFactors.userId, userId),
        eq(mfaFactors.type, "totp"),
        eq(mfaFactors.verified, true),
        eq(mfaFactors.isBackup, false),
      ),
    )
    .limit(1);
  return !!factor;
}

/**
 * POST /api/auth/login
 *
 * Validates user credentials with account lockout protection,
 * MFA challenge support, and login history tracking.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const userAgent = request.headers.get("user-agent") ?? null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      // Log failed attempt for non-existent user (we don't have a userId, so log with email)
      await db.insert(loginHistory).values({
        userId: null,
        ipAddress,
        userAgent,
        success: false,
        mfaUsed: false,
        failureReason: "user_not_found",
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // ── Account Lockout Check ──────────────────────────────────────────
    const lockout = checkLockout(user.id);
    if (lockout.locked) {
      return NextResponse.json(
        {
          error: "Account temporarily locked due to too many failed attempts",
          locked: true,
          lockUntil: lockout.lockUntil?.toISOString(),
        },
        { status: 423 }, // 423 Locked
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      // Record failed attempt
      recordFailedAttempt(user.id);

      // Log to history
      await db.insert(loginHistory).values({
        userId: user.id,
        ipAddress,
        userAgent,
        success: false,
        mfaUsed: false,
        failureReason: "invalid_password",
      });

      // Check lockout status after recording
      const afterLockout = checkLockout(user.id);

      return NextResponse.json(
        {
          error: "Invalid email or password",
          ...(afterLockout.locked
            ? {
                locked: true,
                lockUntil: afterLockout.lockUntil?.toISOString(),
              }
            : {
                remainingAttempts: afterLockout.remainingAttempts,
              }),
        },
        { status: afterLockout.locked ? 423 : 401 },
      );
    }

    // ── Successful Password — Check MFA ────────────────────────────────
    const mfaEnabled = await isMfaEnabled(user.id);

    if (mfaEnabled) {
      // Record successful password step but don't reset lockout yet
      // MFA challenge required — return mfaRequired flag
      return NextResponse.json(
        {
          mfaRequired: true,
          userId: user.id,
          message: "Password verified. MFA challenge required.",
        },
        { status: 200 },
      );
    }

    // ── Full Success (No MFA) ──────────────────────────────────────────
    resetAttempts(user.id);

    // Log successful login
    await db.insert(loginHistory).values({
      userId: user.id,
      ipAddress,
      userAgent,
      success: true,
      mfaUsed: false,
    });

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        message: "Credentials verified. Use /api/auth/callback/credentials to obtain session.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
