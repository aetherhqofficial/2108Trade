import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getRateLimitConfig,
  getClientIP,
} from "@/lib/rate-limit";

/**
 * Security headers applied to all responses.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
};

/**
 * Apply security headers to a response.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

/**
 * Log request details with method, path, status, duration, and client IP.
 */
function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  ip: string,
): void {
  console.log(
    JSON.stringify({
      method,
      path,
      status,
      duration_ms: durationMs,
      ip,
    }),
  );
}

/**
 * Protected API routes middleware.
 * - Applies rate limiting to all /api/* routes
 * - Applies security headers to all responses
 * - Ensures only authenticated users can access /api/* routes
 *   except for auth endpoints and internal endpoints.
 * - Logs request method, path, status, duration, and client IP.
 */
export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // ── Rate Limiting (all API routes) ──────────────────────────────────
  const { config, namespace } = getRateLimitConfig(pathname);
  const clientIP = getClientIP(request);
  const { allowed, retryAfter } = checkRateLimit(clientIP, namespace, config);
  let response: NextResponse;

  if (!allowed) {
    response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
  } else if (
    // ── Public Auth Endpoints ─────────────────────────────────────────
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/callback") ||
    pathname.startsWith("/api/auth/csrf") ||
    pathname.startsWith("/api/auth/providers")
  ) {
    response = NextResponse.next();
  } else if (
    // ── Internal Service Endpoints ────────────────────────────────────
    pathname.startsWith("/api/internal/")
  ) {
    response = NextResponse.next();
  } else {
    // ── Protected Routes ──────────────────────────────────────────────
    const sessionCookie =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");

    if (!sessionCookie) {
      response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    } else {
      response = NextResponse.next();
    }
  }

  logRequest(
    request.method,
    pathname,
    response.status,
    Date.now() - start,
    clientIP,
  );

  return applySecurityHeaders(response);
}

export const config = {
  matcher: "/api/:path*",
};
