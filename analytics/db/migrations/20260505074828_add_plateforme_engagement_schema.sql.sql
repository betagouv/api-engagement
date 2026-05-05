-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."user_scoring" (
  "id" TEXT PRIMARY KEY,
  "distinct_id" TEXT,
  "mission_alert_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."user_scoring_value" (
  "id" TEXT PRIMARY KEY,
  "user_scoring_id" TEXT NOT NULL,
  "taxonomy_key" TEXT,
  "value_key" TEXT,
  "score" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."matching_engine_result" (
  "id" TEXT PRIMARY KEY,
  "user_scoring_id" TEXT NOT NULL,
  "matching_engine_version" TEXT NOT NULL,
  "results" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_enrichment" (
  "id" TEXT PRIMARY KEY,
  "mission_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_enrichment_value" (
  "id" TEXT PRIMARY KEY,
  "enrichment_id" TEXT NOT NULL,
  "taxonomy_key" TEXT,
  "value_key" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_scoring" (
  "id" TEXT PRIMARY KEY,
  "mission_id" TEXT NOT NULL,
  "mission_enrichment_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_scoring_value" (
  "id" TEXT PRIMARY KEY,
  "mission_scoring_id" TEXT NOT NULL,
  "mission_enrichment_value_id" TEXT,
  "taxonomy_key" TEXT,
  "value_key" TEXT,
  "score" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_scoring_value";
DROP TABLE IF EXISTS "analytics_raw"."mission_scoring";
DROP TABLE IF EXISTS "analytics_raw"."mission_enrichment_value";
DROP TABLE IF EXISTS "analytics_raw"."mission_enrichment";
DROP TABLE IF EXISTS "analytics_raw"."matching_engine_result";
DROP TABLE IF EXISTS "analytics_raw"."user_scoring_value";
DROP TABLE IF EXISTS "analytics_raw"."user_scoring";
