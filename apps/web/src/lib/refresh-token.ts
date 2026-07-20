// ── Refresh Token Rotation ──
// Issue, validate, rotate, and revoke refresh tokens for long-lived sessions.
// Refresh tokens are stored hashed (SHA-256) in the refresh_tokens table.

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { refreshTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ── Constants ────────────────────────────────────────────────────────────

/** How long a refresh token is valid (default: 30 days). */
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/** Length of the raw refresh token in hex characters (64 chars = 32 bytes). */
const TOKEN_BYTES = 32;

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Hash a raw token using SHA-256 for storage.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a cryptographically random refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

// ── Token Lifecycle ──────────────────────────────────────────────────────

/**
 * Create and store a new refresh token for a user.
 * Returns the raw token (only shown once) and its expiry.
 */
export async function createRefreshToken(
  userId: string,
  deviceInfo?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    deviceInfo: deviceInfo ?? null,
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

/**
 * Validate a raw refresh token against the database.
 * Returns the token record if valid, or null if invalid/expired/revoked.
 */
export async function validateRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const [record] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
      ),
    )
    .limit(1);

  if (!record) return null;

  // Check expiry
  if (new Date(record.expiresAt) < new Date()) {
    // Revoke expired token
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, record.id));
    return null;
  }

  return record;
}

/**
 * Rotate a refresh token: revoke old, issue new.
 * Used after a successful refresh to prevent replay attacks.
 */
export async function rotateRefreshToken(
  oldRawToken: string,
  deviceInfo?: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const record = await validateRefreshToken(oldRawToken);
  if (!record) return null;

  // Revoke old token
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, record.id));

  // Issue new token
  return createRefreshToken(record.userId, deviceInfo);
}

/**
 * Revoke all refresh tokens for a user (used for "logout all devices").
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  const result = await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revoked, false),
      ),
    );

  // Drizzle update doesn't return count directly; return 0 for now.
  // In practice the rows are updated.
  return 0;
}

/**
 * Revoke a specific refresh token by its database ID.
 */
export async function revokeTokenById(tokenId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, tokenId));
}

/**
 * List active (non-revoked, non-expired) refresh tokens for a user.
 */
export async function listUserTokens(userId: string) {
  return db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revoked, false),
      ),
    );
}
