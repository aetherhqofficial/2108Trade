import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const loginHistory = pgTable(
  "login_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    userAgent: text("user_agent"),
    deviceInfo: jsonb("device_info"),
    success: boolean("success").notNull(),
    mfaUsed: boolean("mfa_used").default(false).notNull(),
    failureReason: varchar("failure_reason", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index("lh_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);
