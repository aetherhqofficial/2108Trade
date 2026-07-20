import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected API routes middleware.
 * Ensures only authenticated users can access /api/* routes
 * except for auth endpoints and internal endpoints.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints
  if (
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/callback") ||
    pathname.startsWith("/api/auth/csrf") ||
    pathname.startsWith("/api/auth/providers")
  ) {
    return NextResponse.next();
  }

  // Allow internal service endpoints (authenticated via service token in production)
  if (pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }

  // For all other /api routes, check for session cookie
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
