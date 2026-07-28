import { pgTable, uuid, varchar, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const alertConditionEnum = pgEnum("alert_condition", [
  "price_above",
  "price_below",
  "pct_change",
]);

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  conditionType: alertConditionEnum("condition_type").notNull(),
  conditionValue: real("condition_value").notNull(),
  triggered: boolean("triggered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  triggeredAt: timestamp("triggered_at"),
});
