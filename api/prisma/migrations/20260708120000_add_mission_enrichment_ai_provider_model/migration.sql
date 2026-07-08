-- Historisation du fournisseur IA et du modèle utilisés pour chaque enrichissement.
-- Colonnes nullable : les lignes existantes (enrichissements antérieurs) restent valides.
ALTER TABLE "mission_enrichment" ADD COLUMN "ai_provider" TEXT;
ALTER TABLE "mission_enrichment" ADD COLUMN "model" TEXT;
