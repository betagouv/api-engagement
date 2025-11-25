-- migrate:up
DO $$ BEGIN
  CREATE TYPE "analytics_raw"."MissionEventType" AS ENUM ('create', 'update', 'delete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "analytics_raw"."mission_event" (
    "id" TEXT PRIMARY KEY,
    "mission_id" TEXT NOT NULL,
    "type" "analytics_raw"."MissionEventType" NOT NULL,
    "changes" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_event";
DROP TYPE IF EXISTS "analytics_raw"."MissionEventType";