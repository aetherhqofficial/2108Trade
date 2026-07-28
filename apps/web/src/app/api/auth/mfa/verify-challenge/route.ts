import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mfaFactors } from "@/db/schema";
import { verifyTOTP } from "@/lib/mfa";
import { createRefreshToken } from "@/lib/refresh-token";
import { eq, and } from "drizzle-orm";
import {
  getChallenge,
  deleteChallenge,
} from "@/app/api/auth/mfa/challenge/route";

/**
 * POST /api/auth/mfa/verify-challenge
 *
 * Verifies the TOTP token against the stored secret.
 * On success, clears the challenge, issues JWT + refresh token.
 * The client should then call NextAuth signIn to get the session cookie.
 */
export async function POST(request: Request) {
  try {
    const { challengeId, token, deviceInfo } = await request.json();

    if (!challengeId || !token) {
      return NextResponse.json(
        { error: "Challenge ID and token are required" },
        { status: 400 },
      );
    }

    // Validate challenge
    const challenge = getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Invalid or expired challenge" },
        { status: 401 },
      );
    }

    // Find the verified TOTP factor
    const [factor] = await db
      .select()
      .from(mfaFactors)
      .where(
        and(
          eq(mfaFactors.userId, challenge.userId),
          eq(mfaFactors.type, "totp"),
          eq(mfaFactors.verified, true),
          eq(mfaFactors.isBackup, false),
        ),
      )
      .limit(1);

    if (!factor) {
      return NextResponse.json(
        { error: "MFA not configured" },
        { status: 400 },
      );
    }

    const isValid = verifyTOTP(factor.secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP token" },
        { status: 401 },
      );
    }

    // Clear challenge
    deleteChallenge(challengeId);

    // Issue refresh token
    const { token: refreshToken, expiresAt } = await createRefreshToken(
      challenge.userId,
      deviceInfo,
    );

    return NextResponse.json(
      {
        message: "MFA verified successfully",
        userId: challenge.userId,
        refreshToken,
        refreshTokenExpiresAt: expiresAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("MFA verify-challenge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
