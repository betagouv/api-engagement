-- migrate:up
ALTER TABLE "analytics_raw"."import"
ADD COLUMN IF NOT EXISTS "error" TEXT;

ALTER TABLE "analytics_raw"."publisher"
ADD COLUMN IF NOT EXISTS "feed" TEXT;

-- Reset du curseur publisher (~700 lignes) pour ré-exporter l'existant (upsert sur id) et remplir feed
DO $$
BEGIN
  DELETE FROM analytics_raw.pg_export_state WHERE "key" = 'publisher';
EXCEPTION WHEN undefined_table THEN
  NULL;
END
$$;

-- migrate:down
ALTER TABLE "analytics_raw"."import"
DROP COLUMN IF EXISTS "error";

ALTER TABLE "analytics_raw"."publisher"
DROP COLUMN IF EXISTS "feed";
