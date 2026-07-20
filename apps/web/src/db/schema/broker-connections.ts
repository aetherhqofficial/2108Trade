import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const brokerStatusEnum = pgEnum("broker_status", [
  "active",
  "inactive",
  "error",
  "pending",
]);

export const brokerConnections = pgTable("broker_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  brokerName: varchar("broker_name", { length: 100 }).notNull(),
  encryptedApiCredentials: text("encrypted_api_credentials").notNull(),
  status: brokerStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
