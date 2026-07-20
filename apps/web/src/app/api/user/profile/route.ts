import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, riskLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  const [limits] = await db
    .select()
    .from(riskLimits)
    .where(eq(riskLimits.userId, session.user.id));

  return NextResponse.json({
    profile: profile ?? null,
    riskLimits: limits ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = session.user.id;

    // Update profile fields if provided
    if (body.profile) {
      const profileUpdates: Record<string, unknown> = {};
      if (body.profile.riskTolerance !== undefined)
        profileUpdates.riskTolerance = body.profile.riskTolerance;
      if (body.profile.investmentGoals !== undefined)
        profileUpdates.investmentGoals = body.profile.investmentGoals;
      if (body.profile.preferredMarkets !== undefined)
        profileUpdates.preferredMarkets = body.profile.preferredMarkets;
      if (body.profile.experienceLevel !== undefined)
        profileUpdates.experienceLevel = body.profile.experienceLevel;
      if (body.profile.maxPositionSizePct !== undefined)
        profileUpdates.maxPositionSizePct = body.profile.maxPositionSizePct;

      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updatedAt = new Date();
        await db
          .update(userProfiles)
          .set(profileUpdates)
          .where(eq(userProfiles.userId, userId));
      }
    }

    // Update risk limits if provided
    if (body.riskLimits) {
      const limitUpdates: Record<string, unknown> = {};
      if (body.riskLimits.maxRiskPerTradePct !== undefined)
        limitUpdates.maxRiskPerTradePct = body.riskLimits.maxRiskPerTradePct;
      if (body.riskLimits.maxDailyLossPct !== undefined)
        limitUpdates.maxDailyLossPct = body.riskLimits.maxDailyLossPct;
      if (body.riskLimits.maxDrawdownPct !== undefined)
        limitUpdates.maxDrawdownPct = body.riskLimits.maxDrawdownPct;
      if (body.riskLimits.maxExposurePct !== undefined)
        limitUpdates.maxExposurePct = body.riskLimits.maxExposurePct;

      if (Object.keys(limitUpdates).length > 0) {
        limitUpdates.updatedAt = new Date();
        await db
          .update(riskLimits)
          .set(limitUpdates)
          .where(eq(riskLimits.userId, userId));
      }
    }

    // Fetch updated data
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    const [limits] = await db
      .select()
      .from(riskLimits)
      .where(eq(riskLimits.userId, userId));

    return NextResponse.json({
      profile: profile ?? null,
      riskLimits: limits ?? null,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
