import { pgTable, uuid, varchar, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const tradeActionEnum = pgEnum("trade_action", ["buy", "sell"]);
export const tradeStatusEnum = pgEnum("trade_status", [
  "pending",
  "executed",
  "cancelled",
  "rejected",
]);

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  action: tradeActionEnum("action").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  status: tradeStatusEnum("status").default("pending").notNull(),
  aiRecommendationId: uuid("ai_recommendation_id"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
