// ── Account Lockout ──
// Tracks failed login attempts in-memory and applies escalating lockouts.
// Rules: 5 failed → 15 min lockout. 10 failed → 1 hour lockout.
// Successful login resets all attempts.

interface LockoutEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const lockoutStore = new Map<string, LockoutEntry>();

/** Periodic cleanup of old entries (>24h without activity). */
let lastCleanup = 0;
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return; // every 5 min
  lastCleanup = now;

  const cutoff = now - 86_400_000; // 24 hours
  for (const [key, entry] of lockoutStore) {
    if (entry.firstAttemptAt < cutoff) {
      lockoutStore.delete(key);
    }
  }
}

/**
 * Check if a user is currently locked out.
 * Returns lock status with remaining attempts and lock expiry if locked.
 */
export function checkLockout(userId: string): {
  locked: boolean;
  remainingAttempts?: number;
  lockUntil?: Date;
} {
  cleanup();

  const entry = lockoutStore.get(userId);
  if (!entry) {
    return { locked: false, remainingAttempts: 5 };
  }

  const now = Date.now();

  // Check if lockout has expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    lockoutStore.delete(userId);
    return { locked: false, remainingAttempts: 5 };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      lockUntil: new Date(entry.lockedUntil),
    };
  }

  // Compute remaining attempts
  const maxAttempts = entry.attempts >= 10 ? 10 : 5;
  const remaining = Math.max(0, maxAttempts - entry.attempts);

  return {
    locked: false,
    remainingAttempts: remaining,
  };
}

/**
 * Record a failed login attempt. Automatically applies lockout at thresholds.
 */
export function recordFailedAttempt(userId: string): void {
  const now = Date.now();
  let entry = lockoutStore.get(userId);

  if (!entry) {
    entry = { attempts: 0, firstAttemptAt: now, lockedUntil: null };
    lockoutStore.set(userId, entry);
  }

  entry.attempts++;

  // Escalating lockout logic
  if (entry.attempts >= 10) {
    entry.lockedUntil = now + 3_600_000; // 1 hour
  } else if (entry.attempts >= 5) {
    entry.lockedUntil = now + 900_000; // 15 minutes
  }
}

/**
 * Reset all failed attempts for a user (on successful login).
 */
export function resetAttempts(userId: string): void {
  lockoutStore.delete(userId);
}

/**
 * For testing: clear all lockout state.
 */
export function _clearLockoutStore(): void {
  lockoutStore.clear();
}
