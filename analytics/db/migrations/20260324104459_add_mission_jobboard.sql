-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_jobboard" (
  "id" TEXT PRIMARY KEY,
  "jobboard_id" TEXT NOT NULL,
  "mission_id" TEXT NOT NULL,
  "mission_address_id" TEXT,
  "public_id" TEXT NOT NULL,
  "sync_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_jobboard";
