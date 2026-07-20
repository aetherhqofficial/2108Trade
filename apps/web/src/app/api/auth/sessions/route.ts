import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshTokens, loginHistory } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/auth/sessions
 *
 * Lists active sessions (refresh tokens) and recent login history
 * for the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get active refresh tokens (sessions)
    const activeTokens = await db
      .select({
        id: refreshTokens.id,
        deviceInfo: refreshTokens.deviceInfo,
        createdAt: refreshTokens.createdAt,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, session.user.id),
          eq(refreshTokens.revoked, false),
        ),
      )
      .orderBy(desc(refreshTokens.createdAt))
      .limit(50);

    // Get recent login history
    const history = await db
      .select({
        id: loginHistory.id,
        ipAddress: loginHistory.ipAddress,
        userAgent: loginHistory.userAgent,
        deviceInfo: loginHistory.deviceInfo,
        success: loginHistory.success,
        mfaUsed: loginHistory.mfaUsed,
        failureReason: loginHistory.failureReason,
        createdAt: loginHistory.createdAt,
      })
      .from(loginHistory)
      .where(eq(loginHistory.userId, session.user.id))
      .orderBy(desc(loginHistory.createdAt))
      .limit(50);

    return NextResponse.json(
      {
        sessions: activeTokens,
        loginHistory: history,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
