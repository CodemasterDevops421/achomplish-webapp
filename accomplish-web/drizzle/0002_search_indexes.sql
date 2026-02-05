-- NOTE: This migration should be run without a surrounding transaction to allow CONCURRENTLY.
-- Ensure pg_trgm is pre-provisioned if your managed Postgres restricts CREATE EXTENSION.
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'pg_trgm extension not installed; provision manually before running index creation.';
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "entries_raw_text_trgm_idx"
ON "entries" USING GIN ("raw_text" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "entry_enrichments_ai_title_trgm_idx"
ON "entry_enrichments" USING GIN ("ai_title" gin_trgm_ops);
