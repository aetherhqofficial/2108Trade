import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeTokenById } from "@/lib/refresh-token";

/**
 * DELETE /api/auth/sessions/[id]
 *
 * Revokes a specific session (refresh token) by ID.
 * Requires authentication.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    await revokeTokenById(id);

    return NextResponse.json(
      { message: "Session revoked successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
