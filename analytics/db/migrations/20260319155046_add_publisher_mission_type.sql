-- migrate:up
ALTER TABLE "analytics_raw"."publisher"
ADD COLUMN IF NOT EXISTS "mission_type" TEXT;


-- migrate:down
ALTER TABLE "analytics_raw"."publisher"
DROP COLUMN IF EXISTS "mission_type";
