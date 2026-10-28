-- migrate:up
ALTER TABLE "analytics_raw"."import"
ADD COLUMN IF NOT EXISTS "error" TEXT;

ALTER TABLE "analytics_raw"."publisher"
ADD COLUMN IF NOT EXISTS "feed" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."import"
DROP COLUMN IF EXISTS "error";

ALTER TABLE "analytics_raw"."publisher"
DROP COLUMN IF EXISTS "feed";
