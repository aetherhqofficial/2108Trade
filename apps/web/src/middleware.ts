import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getRateLimitConfig,
  getClientIP,
} from "@/lib/rate-limit";
import { validateCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

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
 * Public auth endpoints that don't require authentication.
 */
const PUBLIC_AUTH_ENDPOINTS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/session",
  "/api/auth/callback",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/refresh",
  "/api/auth/mfa/challenge",
  "/api/auth/mfa/verify-challenge",
];

/**
 * Protected API routes middleware.
 * - Applies rate limiting to all /api/* routes
 * - Applies security headers to all responses
 * - CSRF validation on state-changing requests (POST/PUT/DELETE)
 * - Ensures only authenticated users can access /api/* routes
 *   except for auth endpoints and internal endpoints.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // ── Rate Limiting (all API routes) ──────────────────────────────────
  const { config, namespace } = getRateLimitConfig(pathname);
  const clientIP = getClientIP(request);
  const { allowed, retryAfter } = checkRateLimit(clientIP, namespace, config);

  if (!allowed) {
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
    return applySecurityHeaders(response);
  }

  // ── CSRF Protection (state-changing requests) ───────────────────────
  // Skip CSRF for public auth endpoints and GET/HEAD/OPTIONS
  const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((ep) =>
    pathname.startsWith(ep),
  );
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  if (isStateChanging && !isPublicAuth) {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    if (!validateCSRFToken(cookieToken, headerToken)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 },
        ),
      );
    }
  }

  // ── Public Auth Endpoints ───────────────────────────────────────────
  if (isPublicAuth) {
    return applySecurityHeaders(NextResponse.next());
  }

  // ── Internal Service Endpoints ──────────────────────────────────────
  if (pathname.startsWith("/api/internal/")) {
    return applySecurityHeaders(NextResponse.next());
  }

  // ── Protected Routes ────────────────────────────────────────────────
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
