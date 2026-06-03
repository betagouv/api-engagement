-- Drop legacy taxonomy relations from scoring/enrichment tables.
ALTER TABLE "mission_enrichment_value" DROP CONSTRAINT IF EXISTS "mission_enrichment_value_taxonomy_value_id_fkey";
ALTER TABLE "mission_scoring_value" DROP CONSTRAINT IF EXISTS "mission_scoring_value_taxonomy_value_id_fkey";
ALTER TABLE "user_scoring_value" DROP CONSTRAINT IF EXISTS "user_scoring_value_taxonomy_value_id_fkey";

DROP INDEX IF EXISTS "mission_enrichment_value_unique";
DROP INDEX IF EXISTS "mission_enrichment_value_taxonomy_value_id_idx";
DROP INDEX IF EXISTS "mission_scoring_value_mission_scoring_taxonomy_value_key";
DROP INDEX IF EXISTS "mission_scoring_value_taxonomy_value_id_idx";
DROP INDEX IF EXISTS "mission_scoring_value_taxonomy_value_score_desc_idx";
DROP INDEX IF EXISTS "user_scoring_value_user_scoring_taxonomy_value_key";
DROP INDEX IF EXISTS "user_scoring_value_taxonomy_value_id_idx";

ALTER TABLE "mission_enrichment_value" DROP COLUMN IF EXISTS "taxonomy_value_id";
ALTER TABLE "mission_scoring_value" DROP COLUMN IF EXISTS "taxonomy_value_id";
ALTER TABLE "user_scoring_value" DROP COLUMN IF EXISTS "taxonomy_value_id";

DROP TABLE IF EXISTS "taxonomy_value";
DROP TABLE IF EXISTS "taxonomy";

DROP TYPE IF EXISTS "TaxonomyType";
DROP TYPE IF EXISTS "TaxonomyKey";
