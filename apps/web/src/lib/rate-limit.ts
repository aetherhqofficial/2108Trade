/**
 * In-memory rate limiter for API endpoints.
 *
 * Uses a sliding-window approach with per-IP tracking.
 * Data is stored in memory — resets on server restart.
 * Upgrade to Redis when scaling beyond a single instance.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000, // 1 minute
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map<string, RateLimitEntry>();
    stores.set(namespace, store);
  }
  return store;
}

/** Periodic cleanup of expired entries — runs at most every 60s */
let lastCleanup = 0;
function cleanup(store: Map<string, RateLimitEntry>): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) {
    return;
  }
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request is rate-limited.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfter: seconds }`.
 */
export function checkRateLimit(
  key: string,
  namespace: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; retryAfter?: number } {
  const store = getStore(namespace);
  const now = Date.now();
  const entry = store.get(key);

  cleanup(store);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired — create new entry
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Determine rate-limit config based on request path.
 */
export function getRateLimitConfig(pathname: string): {
  config: RateLimitConfig;
  namespace: string;
} {
  // Auth: login — 5 per IP per minute
  if (pathname === "/api/auth/login") {
    return {
      config: { maxRequests: 5, windowMs: 60_000 },
      namespace: "auth:login",
    };
  }

  // Auth: register — 3 per IP per hour
  if (pathname === "/api/auth/register") {
    return {
      config: { maxRequests: 3, windowMs: 3_600_000 },
      namespace: "auth:register",
    };
  }

  // Auth: forgot-password — 3 per IP per hour
  if (pathname === "/api/auth/forgot-password") {
    return {
      config: { maxRequests: 3, windowMs: 3_600_000 },
      namespace: "auth:forgot-password",
    };
  }

  // Auth: reset-password — 5 per IP per minute
  if (pathname === "/api/auth/reset-password") {
    return {
      config: { maxRequests: 5, windowMs: 60_000 },
      namespace: "auth:reset-password",
    };
  }

  // AI analyze — 10 per user per minute (uses user ID from session, falls back to IP)
  if (pathname === "/api/v1/analyze") {
    return {
      config: { maxRequests: 10, windowMs: 60_000 },
      namespace: "ai:analyze",
    };
  }

  // Default for all other API endpoints: 60 per minute
  return {
    config: { maxRequests: 60, windowMs: 60_000 },
    namespace: "default",
  };
}

/**
 * Extract a client identifier from the request.
 * Prefers X-Forwarded-For header, falls back to direct IP.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}
