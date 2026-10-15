-- migrate:up
ALTER TABLE "analytics_raw"."publisher"
ADD COLUMN IF NOT EXISTS "expected_applications" BOOLEAN,
ADD COLUMN IF NOT EXISTS "deployment_user_id" TEXT;


-- migrate:down
ALTER TABLE "analytics_raw"."publisher"
DROP COLUMN IF EXISTS "expected_applications",
DROP COLUMN IF EXISTS "deployment_user_id";
