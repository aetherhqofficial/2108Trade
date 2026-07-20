import { pgTable, uuid, varchar, timestamp, real, text, pgEnum } from "drizzle-orm/pg-core";

export const experienceLevelEnum = pgEnum("experience_level", [
  "beginner",
  "intermediate",
  "advanced",
  "professional",
]);

export const preferredMarketEnum = pgEnum("preferred_market", [
  "stocks",
  "etfs",
  "forex",
  "crypto",
  "commodities",
  "indices",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  riskTolerance: varchar("risk_tolerance", { length: 20 }).default("moderate"),
  investmentGoals: text("investment_goals"),
  preferredMarkets: preferredMarketEnum("preferred_markets").array(),
  experienceLevel: experienceLevelEnum("experience_level").default("beginner"),
  maxPositionSizePct: real("max_position_size_pct").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
