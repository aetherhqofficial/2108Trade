import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mfaFactors } from "@/db/schema";
import { verifyTOTP, generateBackupCodes } from "@/lib/mfa";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/auth/mfa/verify
 *
 * Verifies a TOTP token against the stored (unverified) secret.
 * If valid, marks the factor as verified, enables MFA, and returns backup codes.
 * Requires authentication.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { token } = await request.json();

    if (!token || typeof token !== "string" || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: "A valid 6-digit TOTP token is required" },
        { status: 400 },
      );
    }

    // Find the unverified TOTP factor
    const [factor] = await db
      .select()
      .from(mfaFactors)
      .where(
        and(
          eq(mfaFactors.userId, session.user.id),
          eq(mfaFactors.type, "totp"),
          eq(mfaFactors.verified, false),
        ),
      )
      .limit(1);

    if (!factor) {
      return NextResponse.json(
        { error: "No pending MFA setup found. Call /api/auth/mfa/setup first." },
        { status: 400 },
      );
    }

    const isValid = verifyTOTP(factor.secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP token. Try again." },
        { status: 401 },
      );
    }

    // Mark factor as verified
    await db
      .update(mfaFactors)
      .set({ verified: true })
      .where(eq(mfaFactors.id, factor.id));

    // Generate backup codes
    const codes = generateBackupCodes(10);

    // Store backup codes as unverified "totp" entries with isBackup=true
    for (const code of codes) {
      await db.insert(mfaFactors).values({
        userId: session.user.id,
        type: "totp",
        secret: code, // In production, hash these; for simplicity store plain since they're single-use
        verified: true,
        isBackup: true,
      });
    }

    return NextResponse.json(
      {
        message: "MFA enabled successfully",
        backupCodes: codes,
        warning: "Store these backup codes in a safe place. They will not be shown again.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
