import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mfaFactors } from "@/db/schema";
import { verifyTOTP } from "@/lib/mfa";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/auth/mfa/disable
 *
 * Disables MFA for the authenticated user.
 * Requires authentication + TOTP confirmation.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "TOTP token is required to disable MFA" },
        { status: 400 },
      );
    }

    // Find the verified TOTP factor (non-backup)
    const [factor] = await db
      .select()
      .from(mfaFactors)
      .where(
        and(
          eq(mfaFactors.userId, session.user.id),
          eq(mfaFactors.type, "totp"),
          eq(mfaFactors.verified, true),
          eq(mfaFactors.isBackup, false),
        ),
      )
      .limit(1);

    if (!factor) {
      return NextResponse.json(
        { error: "MFA is not enabled" },
        { status: 400 },
      );
    }

    const isValid = verifyTOTP(factor.secret, token);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP token" },
        { status: 401 },
      );
    }

    // Delete all MFA factors for the user
    await db
      .delete(mfaFactors)
      .where(eq(mfaFactors.userId, session.user.id));

    return NextResponse.json(
      { message: "MFA disabled successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("MFA disable error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
