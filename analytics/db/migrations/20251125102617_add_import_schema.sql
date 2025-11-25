-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."import" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "publisher_id" TEXT NOT NULL,
  "mission_count" INTEGER NOT NULL DEFAULT 0,
  "refused_count" INTEGER NOT NULL DEFAULT 0,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "deleted_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "status" TEXT NOT NULL
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."import";
