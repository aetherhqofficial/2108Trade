/**
 * Development seed script — populates the database with test data.
 *
 * Usage: bun run src/scripts/seed.ts
 */

import { db } from "@/lib/db";
import { users, userProfiles, riskLimits, portfolios, positions, trades } from "@/db/schema";
import { hashPassword } from "@/lib/password";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create test user
  const passwordHash = await hashPassword("test1234");
  const [user] = await db
    .insert(users)
    .values({
      email: "demo@2108trade.com",
      passwordHash,
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log("  ℹ️  Test user already exists, skipping.");
    return;
  }

  console.log(`  ✅ Created test user: ${user.email}`);

  // Create profile
  const [profile] = await db
    .insert(userProfiles)
    .values({
      userId: user.id,
      riskTolerance: "moderate",
      investmentGoals: "Long-term growth with moderate risk exposure",
      preferredMarkets: ["stocks", "crypto", "etfs"],
      experienceLevel: "intermediate",
      maxPositionSizePct: 10,
    })
    .returning();
  console.log(`  ✅ Created user profile`);

  // Create risk limits
  const [limits] = await db
    .insert(riskLimits)
    .values({
      userId: user.id,
      maxRiskPerTradePct: 2,
      maxDailyLossPct: 5,
      maxDrawdownPct: 20,
      maxExposurePct: 50,
    })
    .returning();
  console.log(`  ✅ Created risk limits`);

  // Create portfolio
  const [portfolio] = await db
    .insert(portfolios)
    .values({
      userId: user.id,
      totalValue: 25000,
      cashBalance: 10000,
    })
    .returning();
  console.log(`  ✅ Created portfolio with $25,000 total value`);

  // Create sample positions
  const samplePositions = [
    { symbol: "AAPL", quantity: 50, avgEntryPrice: 175.5, currentPrice: 182.3 },
    { symbol: "MSFT", quantity: 30, avgEntryPrice: 380.2, currentPrice: 392.1 },
    { symbol: "BTC/USDT", quantity: 0.15, avgEntryPrice: 42000, currentPrice: 43500 },
  ];

  for (const pos of samplePositions) {
    await db.insert(positions).values({
      portfolioId: portfolio.id,
      ...pos,
    });
  }
  console.log(`  ✅ Created ${samplePositions.length} sample positions`);

  // Create sample trades
  const sampleTrades = [
    { symbol: "AAPL", action: "buy" as const, quantity: 50, price: 175.5, status: "executed" as const },
    { symbol: "MSFT", action: "buy" as const, quantity: 30, price: 380.2, status: "executed" as const },
    { symbol: "TSLA", action: "sell" as const, quantity: 10, price: 245.0, status: "executed" as const },
  ];

  for (const trade of sampleTrades) {
    await db.insert(trades).values({
      userId: user.id,
      ...trade,
      executedAt: new Date(),
    });
  }
  console.log(`  ✅ Created ${sampleTrades.length} sample trades`);

  console.log("\n🎉 Seeding complete!");
  console.log("\n   Demo credentials:");
  console.log("   Email:    demo@2108trade.com");
  console.log("   Password: test1234");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
