import { pgTable, uuid, text, real, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { aiConversations } from "./ai-conversations";

export const recStatusEnum = pgEnum("rec_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

export const aiRecommendations = pgTable("ai_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbols: text("symbols").array(),
  recommendation: jsonb("recommendation").notNull(),
  confidence: real("confidence").notNull(),
  status: recStatusEnum("status").default("pending").notNull(),
  aiConversationId: uuid("ai_conversation_id").references(
    () => aiConversations.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
