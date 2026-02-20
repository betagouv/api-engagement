-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_activity" (
  "mission_id" TEXT NOT NULL,
  "activity_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("mission_id", "activity_id")
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_activity";
