import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolios, positions, paperAccounts, trades } from "@/db/schema";
import { eq } from "drizzle-orm";

interface HealthBreakdown {
  diversification: { score: number; label: string; detail: string };
  riskLevel: { score: number; label: string; detail: string };
  performance: { score: number; label: string; detail: string };
}

function computeDiversification(symbols: string[]): { score: number; label: string; detail: string } {
  const uniqueSymbols = [...new Set(symbols)];
  const count = uniqueSymbols.length;

  if (count === 0) {
    return { score: 0, label: "No Positions", detail: "You don't have any open positions yet. Consider building a diversified portfolio across multiple sectors." };
  }
  if (count === 1) {
    return { score: 15, label: "Highly Concentrated", detail: "You're concentrated in a single position — consider diversifying across different sectors to reduce risk." };
  }
  if (count === 2) {
    return { score: 35, label: "Narrow", detail: "Only 2 positions. Adding more assets across different sectors can help spread your risk." };
  }
  if (count <= 4) {
    return { score: 65, label: "Moderate", detail: `Your portfolio is fairly balanced across ${count} positions. Adding a few more can improve resilience.` };
  }
  if (count <= 7) {
    return { score: 80, label: "Well-Balanced", detail: `Your portfolio is well-balanced across ${count} sectors — good diversification.` };
  }
  return { score: 95, label: "Excellent Diversity", detail: `Your portfolio is spread across ${count} different positions — excellent diversification.` };
}

function computeRiskLevel(
  posList: typeof positions.$inferSelect[],
  totalValue: number,
): { score: number; label: string; detail: string } {
  const positionCount = posList.length;
  if (positionCount === 0 || totalValue === 0) {
    return { score: 100, label: "No Risk", detail: "Your portfolio is entirely in cash — no market risk. Consider starting with small positions to learn." };
  }

  // Compute concentration: max position as % of portfolio
  let maxPositionValue = 0;
  for (const pos of posList) {
    const posValue = (pos.currentPrice ?? pos.avgEntryPrice) * pos.quantity;
    if (posValue > maxPositionValue) maxPositionValue = posValue;
  }
  const concentration = maxPositionValue / totalValue;

  if (concentration > 0.5) {
    return { score: 25, label: "High Concentration Risk", detail: "Over 50% of your portfolio is in a single position. If that asset drops, your portfolio takes a big hit." };
  }
  if (concentration > 0.3) {
    return { score: 55, label: "Moderate Concentration", detail: "A significant portion is in one position — consider spreading your allocation more evenly." };
  }
  return { score: 85, label: "Well-Distributed", detail: "Your portfolio is well-distributed — no single position dominates your holdings." };
}

function computePerformance(posList: typeof positions.$inferSelect[]): { score: number; label: string; detail: string } {
  if (posList.length === 0) {
    return { score: 50, label: "No Track Record", detail: "No performance data yet — make your first trade to start building a track record." };
  }

  let totalGain = 0;
  let positionsWithData = 0;
  for (const pos of posList) {
    if (pos.currentPrice && pos.avgEntryPrice) {
      totalGain += (pos.currentPrice - pos.avgEntryPrice) * pos.quantity;
      positionsWithData++;
    }
  }

  if (positionsWithData === 0) {
    return { score: 50, label: "Pending Data", detail: "Waiting for price data to calculate performance. Check back soon." };
  }

  if (totalGain > 0) {
    return { score: 80, label: "Positive Trend", detail: "Your positions are showing gains — the trend is in your favor. Stay disciplined with your strategy." };
  }
  if (totalGain < 0) {
    return { score: 40, label: "Under Pressure", detail: "Some positions are below your entry price. Review your thesis for each position and consider if it still holds." };
  }
  return { score: 65, label: "Flat", detail: "Your positions are trading near your entry prices — the market hasn't made a decisive move yet." };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get portfolio
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId));

  // Get positions
  const userPositions = portfolio
    ? await db.select().from(positions).where(eq(positions.portfolioId, portfolio.id))
    : [];

  // Get paper account
  const [paperAccount] = await db
    .select()
    .from(paperAccounts)
    .where(eq(paperAccounts.userId, userId));

  const totalValue = portfolio?.totalValue ?? 0;
  const cashBalance = portfolio?.cashBalance ?? 0;
  const paperBalance = paperAccount?.balance ?? 0;

  const symbols = userPositions.map((p) => p.symbol);

  const diversification = computeDiversification(symbols);
  const riskLevel = computeRiskLevel(userPositions, totalValue);
  const performance = computePerformance(userPositions);

  const overallScore = Math.round(
    (diversification.score + riskLevel.score + performance.score) / 3,
  );

  const breakdown: HealthBreakdown = {
    diversification,
    riskLevel,
    performance,
  };

  const summary = "";
  let colorClass = "text-emerald-400";
  if (overallScore <= 40) {
    colorClass = "text-red-400";
  } else if (overallScore <= 70) {
    colorClass = "text-amber-400";
  }

  return NextResponse.json({
    score: overallScore,
    colorClass,
    breakdown,
    summary: {
      totalValue,
      cashBalance,
      paperBalance,
      positionCount: userPositions.length,
    },
  });
}
