-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_moderation_status" (
  "id" TEXT PRIMARY KEY,
  "mission_id" TEXT NOT NULL,
  "publisher_id" TEXT NOT NULL,
  "status" TEXT,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_moderation_status";
