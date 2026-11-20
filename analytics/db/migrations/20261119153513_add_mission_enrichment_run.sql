-- migrate:up

CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_enrichment_run" (
  "id" TEXT PRIMARY KEY,
  "mission_enrichment_id" TEXT,
  "prompt_version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down

DROP TABLE IF EXISTS "analytics_raw"."mission_enrichment_run";
