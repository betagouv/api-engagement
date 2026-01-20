-- migrate:up
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "analytics_raw"."mission"
ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "analytics_raw"."mission"
  ADD COLUMN IF NOT EXISTS "compensation_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "compensation_type" TEXT,
  ADD COLUMN IF NOT EXISTS "compensation_unit" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "title";
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "description";
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "compensation_amount";
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "compensation_type";
ALTER TABLE "analytics_raw"."mission"
DROP COLUMN IF EXISTS "compensation_unit";