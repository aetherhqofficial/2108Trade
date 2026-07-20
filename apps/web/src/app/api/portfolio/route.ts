import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolios, positions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId));

  if (!portfolio) {
    return NextResponse.json(
      { error: "Portfolio not found" },
      { status: 404 },
    );
  }

  const portfolioPositions = await db
    .select()
    .from(positions)
    .where(eq(positions.portfolioId, portfolio.id));

  // Calculate P&L
  const positionsWithPnL = portfolioPositions.map((pos) => {
    const currentPrice = pos.currentPrice ?? pos.avgEntryPrice;
    const pnl =
      (currentPrice - pos.avgEntryPrice) * pos.quantity;
    const pnlPct =
      pos.avgEntryPrice > 0
        ? ((currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100
        : 0;
    return { ...pos, pnl, pnlPct };
  });

  const totalPositionsValue = positionsWithPnL.reduce(
    (sum, pos) => sum + (pos.currentPrice ?? pos.avgEntryPrice) * pos.quantity,
    0,
  );

  const totalPnL = positionsWithPnL.reduce((sum, pos) => sum + pos.pnl, 0);

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      positionsValue: totalPositionsValue,
      totalPnL,
    },
    positions: positionsWithPnL,
  });
}
