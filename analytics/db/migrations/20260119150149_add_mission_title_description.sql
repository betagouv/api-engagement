-- migrate:up
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "title";
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "description";