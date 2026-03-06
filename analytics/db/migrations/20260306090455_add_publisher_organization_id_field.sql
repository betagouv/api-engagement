-- migrate:up
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "publisher_organization_id" TEXT;


-- migrate:down
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "publisher_organization_id";
