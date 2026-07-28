import { pgTable, uuid, varchar, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { aiRecommendations } from "./ai-recommendations";

export const strategyConfigs = pgTable("strategy_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  strategyType: varchar("strategy_type", { length: 100 }).notNull(),
  parameters: jsonb("parameters").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  aiRecommendationId: uuid("ai_recommendation_id").references(
    () => aiRecommendations.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
