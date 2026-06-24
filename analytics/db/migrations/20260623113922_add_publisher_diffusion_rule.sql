-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."publisher_diffusion_rule" (
  "id" TEXT PRIMARY KEY,
  "publisher_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "field_type" TEXT,
  "operator" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "combinator" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "combined_with_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."publisher_diffusion_rule";
