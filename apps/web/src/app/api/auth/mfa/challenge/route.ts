import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mfaFactors } from "@/db/schema";
import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";

// In-memory challenge store (in production, use Redis with TTL)
const challengeStore = new Map<string, { userId: string; expiresAt: number }>();

// Clean up expired challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of challengeStore) {
    if (challenge.expiresAt < now) challengeStore.delete(id);
  }
}, 60_000).unref();

/**
 * POST /api/auth/mfa/challenge
 *
 * Called during login when MFA is required.
 * Creates a challenge that must be completed before issuing tokens.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Check if user has MFA enabled
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

    if (!factor) {
      return NextResponse.json(
        { error: "MFA is not enabled for this user" },
        { status: 400 },
      );
    }

    // Create a challenge
    const challengeId = randomBytes(16).toString("hex");
    challengeStore.set(challengeId, {
      userId,
      expiresAt: Date.now() + 300_000, // 5 minutes
    });

    return NextResponse.json(
      {
        mfaRequired: true,
        mfaChallengeId: challengeId,
        message: "Enter your 6-digit authenticator code",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("MFA challenge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Exported for use in verify-challenge route */
export function getChallenge(
  challengeId: string,
): { userId: string; expiresAt: number } | null {
  const challenge = challengeStore.get(challengeId);
  if (!challenge || challenge.expiresAt < Date.now()) {
    challengeStore.delete(challengeId);
    return null;
  }
  return challenge;
}

export function deleteChallenge(challengeId: string): void {
  challengeStore.delete(challengeId);
}
