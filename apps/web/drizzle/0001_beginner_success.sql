-- Beginner Success System Phase 1: paper accounts, onboarding, emergency stop
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;
ALTER TABLE "risk_limits" ADD COLUMN "emergency_stop" boolean DEFAULT false NOT NULL;
ALTER TABLE "risk_limits" ADD COLUMN "trading_paused" boolean DEFAULT false NOT NULL;

CREATE TABLE "paper_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "balance" real DEFAULT 10000 NOT NULL,
  "initial_balance" real DEFAULT 10000 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "paper_accounts_user_id_unique" UNIQUE ("user_id")
);
