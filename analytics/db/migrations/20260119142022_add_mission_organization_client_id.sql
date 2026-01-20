-- migrate:up
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "organization_client_id" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "organization_client_id";
