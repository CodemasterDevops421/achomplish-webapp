CREATE TABLE IF NOT EXISTS "entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "entry_date" date NOT NULL,
  "raw_text" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "entries_user_date_unique" UNIQUE ("user_id", "entry_date")
);

CREATE INDEX IF NOT EXISTS "entries_user_date_idx" ON "entries" ("user_id", "entry_date");
CREATE INDEX IF NOT EXISTS "entries_user_deleted_idx" ON "entries" ("user_id", "deleted_at");

CREATE TABLE IF NOT EXISTS "entry_enrichments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entry_id" uuid NOT NULL REFERENCES "entries"("id") ON DELETE CASCADE,
  "ai_provider" text NOT NULL,
  "ai_model" text NOT NULL,
  "ai_title" text,
  "ai_bullets" jsonb,
  "ai_category" text,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "entry_enrichments_entry_version_idx" ON "entry_enrichments" ("entry_id", "version");

CREATE TABLE IF NOT EXISTS "generated_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "type" text NOT NULL CHECK ("type" IN ('review', 'resume')),
  "range_start" date NOT NULL,
  "range_end" date NOT NULL,
  "output_markdown" text NOT NULL,
  "input_snapshot" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "generated_outputs_user_type_range_idx" ON "generated_outputs" ("user_id", "type", "range_start", "range_end");

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" text PRIMARY KEY,
  "email_reminders_enabled" boolean DEFAULT true NOT NULL,
  "reminder_time" time DEFAULT '18:30' NOT NULL,
  "reminder_timezone" text DEFAULT 'UTC' NOT NULL,
  "skip_weekends" boolean DEFAULT true NOT NULL,
  "last_reminder_sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rate_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "key" text NOT NULL,
  "window_start" timestamptz NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "rate_limits_user_key_window_unique" UNIQUE ("user_id", "key", "window_start")
);

CREATE INDEX IF NOT EXISTS "rate_limits_user_key_idx" ON "rate_limits" ("user_id", "key");
