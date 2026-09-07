-- migrate:up
ALTER TABLE "analytics_raw"."user_scoring"
ADD COLUMN IF NOT EXISTS "matching_engine_version" TEXT;


-- migrate:down
ALTER TABLE "analytics_raw"."user_scoring"
DROP COLUMN IF EXISTS "matching_engine_version";
