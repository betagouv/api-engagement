-- migrate:up
-- Fournisseur IA + modèle utilisés pour chaque enrichissement, exportés depuis la base opérationnelle.
ALTER TABLE "analytics_raw"."mission_enrichment" ADD COLUMN IF NOT EXISTS "ai_provider" TEXT;
ALTER TABLE "analytics_raw"."mission_enrichment" ADD COLUMN IF NOT EXISTS "model" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."mission_enrichment" DROP COLUMN IF EXISTS "model";
ALTER TABLE "analytics_raw"."mission_enrichment" DROP COLUMN IF EXISTS "ai_provider";
