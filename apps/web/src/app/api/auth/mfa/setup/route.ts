import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mfaFactors } from "@/db/schema";
import { generateTOTPSecret } from "@/lib/mfa";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/auth/mfa/setup
 *
 * Generates a TOTP secret and returns the URI + QR code for setup.
 * Requires authentication. Does NOT enable MFA yet — that happens on verify.
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

    // Check if user already has a verified MFA factor
    const [existing] = await db
      .select({ id: mfaFactors.id })
      .from(mfaFactors)
      .where(
        and(
          eq(mfaFactors.userId, session.user.id),
          eq(mfaFactors.type, "totp"),
          eq(mfaFactors.verified, true),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "MFA is already set up. Disable it first to reconfigure." },
        { status: 409 },
      );
    }

    const { secret, uri, qrCode } = generateTOTPSecret(
      "2108Trade",
      session.user.email ?? session.user.id,
    );

    // Store the unverified secret
    // Remove any previous unverified TOTP factors first
    await db
      .delete(mfaFactors)
      .where(
        and(
          eq(mfaFactors.userId, session.user.id),
          eq(mfaFactors.type, "totp"),
          eq(mfaFactors.verified, false),
        ),
      );

    await db.insert(mfaFactors).values({
      userId: session.user.id,
      type: "totp",
      secret,
      verified: false,
    });

    return NextResponse.json(
      {
        secret,
        uri,
        qrCode,
        message: "Scan the QR code with your authenticator app, then verify with POST /api/auth/mfa/verify",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
