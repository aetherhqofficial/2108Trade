import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const mfaFactors = pgTable(
  "mfa_factors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("totp"),
    secret: varchar("secret", { length: 255 }).notNull(),
    verified: boolean("verified").default(false).notNull(),
    isBackup: boolean("is_backup").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userTypeIdx: index("mfa_user_type_idx").on(table.userId, table.type),
  }),
);
