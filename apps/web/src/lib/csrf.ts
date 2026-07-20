// ── CSRF Protection ──
// Token-based CSRF protection for state-changing requests.
// Generates a token, stores it in a cookie, and validates it via header.
// Uses double-submit cookie pattern.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCSRFToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Set the CSRF token cookie on the response.
 * Uses SameSite=Strict, HttpOnly=false (so JS can read it for the header),
 * Secure=true in production.
 */
export async function setCSRFCookie(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JS to send in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 3600, // 1 hour
  });

  return token;
}

/**
 * Get the CSRF token from the cookie (for API routes using next/headers).
 */
export async function getCSRFCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Validate a CSRF token from request headers against the cookie.
 * Uses double-submit cookie pattern with timing-safe comparison.
 * Works in both middleware (with NextRequest) and API routes (with Request).
 */
export function validateCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | null | undefined,
): boolean {
  if (!cookieToken || !headerToken) return false;

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);

  if (a.length !== b.length) return false;

  // Timing-safe comparison
  return timingSafeEqual(a, b);
}

/**
 * Validate a CSRF token in an API route handler (uses next/headers cookies).
 * For middleware, use validateCSRFToken directly with request.cookies.
 */
export async function validateCSRF(request: Request): Promise<boolean> {
  const cookieToken = await getCSRFCookie();
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return validateCSRFToken(cookieToken, headerToken);
}

export { CSRF_HEADER_NAME, CSRF_COOKIE_NAME };
