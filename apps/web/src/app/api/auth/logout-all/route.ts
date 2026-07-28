import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeAllUserTokens } from "@/lib/refresh-token";

/**
 * POST /api/auth/logout-all
 *
 * Revokes all refresh tokens for the authenticated user.
 * Requires authentication.
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await revokeAllUserTokens(session.user.id);

    return NextResponse.json(
      { message: "All sessions revoked successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Logout-all error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
