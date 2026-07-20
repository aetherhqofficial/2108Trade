import { pgTable, uuid, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const paperAccounts = pgTable("paper_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: real("balance").default(10000).notNull(),
  initialBalance: real("initial_balance").default(10000).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
