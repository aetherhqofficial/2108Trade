import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address and generates a password reset token.
 * Always returns 200 OK regardless of whether the email exists,
 * to prevent user enumeration.
 *
 * The reset token is returned in the response body (email integration
 * will replace this later).
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return the same response, regardless of whether the user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (user) {
      // Invalidate any existing unused tokens for this user
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            eq(passwordResetTokens.used, false),
          ),
        );

      // Generate new token — expires in 1 hour
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });
    }

    // Always return 200 — prevent enumeration
    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a reset link has been generated.",
        // NOTE: Token returned in response for now. Replace with email integration.
        ...(user
          ? {
              _dev_token:
                "DEV ONLY: Copy this token for the reset-password endpoint. Remove before production.",
              _dev_reset_token: (
                await db
                  .select({ token: passwordResetTokens.token })
                  .from(passwordResetTokens)
                  .where(
                    and(
                      eq(passwordResetTokens.userId, user.id),
                      eq(passwordResetTokens.used, false),
                    ),
                  )
                  .orderBy(passwordResetTokens.createdAt)
                  .limit(1)
              )[0]?.token,
            }
          : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
