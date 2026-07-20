import type { Config } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://2108trade:2108trade@localhost:5432/2108trade";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
} satisfies Config;
