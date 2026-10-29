-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."warning" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "publisher_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL,
  "procedure_url" TEXT,
  "notified_at" TIMESTAMP(3),
  "fixed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "warning_publisher_id_idx" ON "analytics_raw"."warning" ("publisher_id");

CREATE TABLE IF NOT EXISTS "analytics_raw"."warning_occurrence" (
  "id" TEXT PRIMARY KEY,
  "warning_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "warning_occurrence_warning_id_idx" ON "analytics_raw"."warning_occurrence" ("warning_id");


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."warning_occurrence";
DROP TABLE IF EXISTS "analytics_raw"."warning";
