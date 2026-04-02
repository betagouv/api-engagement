-- migrate:up
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "organization_id" CASCADE;

ALTER TABLE "analytics_raw"."publisher_organization"
DROP COLUMN IF EXISTS "organisation_is_rup" CASCADE;

-- migrate:down
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

ALTER TABLE "analytics_raw"."publisher_organization"
ADD COLUMN IF NOT EXISTS "organisation_is_rup" BOOLEAN;
