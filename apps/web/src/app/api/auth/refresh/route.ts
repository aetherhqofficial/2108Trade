import { NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/refresh-token";

/**
 * POST /api/auth/refresh
 *
 * Accepts a refresh token, validates it, issues a new JWT + new refresh token.
 * Old refresh token is revoked (rotation).
 */
export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 },
      );
    }

    const result = await rotateRefreshToken(refreshToken);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        refreshToken: result.token,
        expiresAt: result.expiresAt.toISOString(),
        message: "Token refreshed successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
