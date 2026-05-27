-- Deduplicate: for each (mission_id, prompt_version) pair, keep only the most recently updated record.
-- Cascade delete removes associated mission_enrichment_value and mission_scoring rows.
DELETE FROM "mission_enrichment"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("mission_id", "prompt_version") "id"
  FROM "mission_enrichment"
  ORDER BY "mission_id", "prompt_version", "updated_at" DESC
);

-- Drop the partial unique index that was managing in-flight concurrency.
DROP INDEX IF EXISTS "mission_enrichment_inflight_unique";

-- Drop the non-unique index replaced by the new unique constraint.
DROP INDEX IF EXISTS "mission_enrichment_mission_version_idx";

-- Add the full unique constraint on (mission_id, prompt_version).
ALTER TABLE "mission_enrichment" ADD CONSTRAINT "mission_enrichment_mission_version_key" UNIQUE ("mission_id", "prompt_version");

-- Add enrichment count column (existing records start at 1).
ALTER TABLE "mission_enrichment" ADD COLUMN "enrichment_count" INTEGER NOT NULL DEFAULT 1;
