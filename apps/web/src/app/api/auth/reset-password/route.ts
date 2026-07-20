import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/auth/reset-password
 *
 * Accepts a reset token and a new password.
 * Validates the token (exists, not used, not expired),
 * updates the user's password, and marks the token as used.
 */
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Find a valid, unused, non-expired token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
        ),
      );

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      // Mark as used so it can't be retried
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));

      return NextResponse.json(
        { error: "Reset token has expired" },
        { status: 400 },
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return NextResponse.json(
      { message: "Password has been reset successfully. Please sign in." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
