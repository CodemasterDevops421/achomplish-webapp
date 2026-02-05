CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "entries_raw_text_trgm_idx"
ON "entries" USING GIN ("raw_text" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "entry_enrichments_ai_title_trgm_idx"
ON "entry_enrichments" USING GIN ("ai_title" gin_trgm_ops);
