import { pgTable, uuid, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const riskLimits = pgTable("risk_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  maxRiskPerTradePct: real("max_risk_per_trade_pct").default(2).notNull(),
  maxDailyLossPct: real("max_daily_loss_pct").default(5).notNull(),
  maxDrawdownPct: real("max_drawdown_pct").default(20).notNull(),
  maxExposurePct: real("max_exposure_pct").default(50).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
