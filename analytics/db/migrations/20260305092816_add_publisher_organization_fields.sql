-- migrate:up
ALTER TABLE "analytics_raw"."publisher_organization"
ADD COLUMN IF NOT EXISTS "organization_id_verified" TEXT;
ALTER TABLE "analytics_raw"."organization"
  ADD COLUMN IF NOT EXISTS "rna" TEXT,
  ADD COLUMN IF NOT EXISTS "siren" TEXT,
  ADD COLUMN IF NOT EXISTS "siret" TEXT,
  ADD COLUMN IF NOT EXISTS "address_number" TEXT,
  ADD COLUMN IF NOT EXISTS "address_complement" TEXT,
  ADD COLUMN IF NOT EXISTS "address_street" TEXT,
  ADD COLUMN IF NOT EXISTS "address_type" TEXT;


-- migrate:down
ALTER TABLE "analytics_raw"."publisher_organization"
DROP COLUMN IF EXISTS "organization_id_verified";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "rna";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "siren";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "siret";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "address_number";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "address_complement";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "address_street";
ALTER TABLE "analytics_raw"."organization"
DROP COLUMN IF EXISTS "address_type";
