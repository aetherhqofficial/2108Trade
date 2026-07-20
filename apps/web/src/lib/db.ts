import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://2108trade:2108trade@localhost:5432/2108trade";

const client = postgres(databaseUrl, { max: 10 });
export const db = drizzle(client, { schema });

export type Database = typeof db;
