import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { riskLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [limits] = await db
    .select()
    .from(riskLimits)
    .where(eq(riskLimits.userId, userId));

  return NextResponse.json({
    riskLimits: limits
      ? {
          maxRiskPerTradePct: limits.maxRiskPerTradePct,
          maxDailyLossPct: limits.maxDailyLossPct,
          maxDrawdownPct: limits.maxDrawdownPct,
          maxExposurePct: limits.maxExposurePct,
          emergencyStop: limits.emergencyStop,
          tradingPaused: limits.tradingPaused,
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  const updates: Record<string, number | boolean | Date> = {};
  if (body.maxRiskPerTradePct !== undefined) updates.maxRiskPerTradePct = body.maxRiskPerTradePct;
  if (body.maxDailyLossPct !== undefined) updates.maxDailyLossPct = body.maxDailyLossPct;
  if (body.maxDrawdownPct !== undefined) updates.maxDrawdownPct = body.maxDrawdownPct;
  if (body.maxExposurePct !== undefined) updates.maxExposurePct = body.maxExposurePct;
  if (body.emergencyStop !== undefined) updates.emergencyStop = body.emergencyStop;
  if (body.tradingPaused !== undefined) updates.tradingPaused = body.tradingPaused;
  updates.updatedAt = new Date();

  await db
    .update(riskLimits)
    .set(updates)
    .where(eq(riskLimits.userId, userId));

  return NextResponse.json({ success: true });
}
