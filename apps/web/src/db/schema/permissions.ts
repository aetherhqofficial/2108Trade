import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const permissionActionEnum = pgEnum("permission_action", [
  "create",
  "read",
  "update",
  "delete",
  "manage",
]);

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: permissionActionEnum("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
