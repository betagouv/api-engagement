-- Fige le moteur de matching par user_scoring : les résultats d'un scoring restent scorés par ce
-- moteur et ne suivent plus la version active (CURRENT_MATCHING_ENGINE_VERSION). Colonne nullable :
-- un scoring sans valeur exploitable retombe sur la version courante au runtime.
ALTER TABLE "user_scoring" ADD COLUMN "matching_engine_version" TEXT;

-- Backfill déterministe des scorings existants depuis les taxonomies déjà répondues :
--   - parcours v2 (au moins une valeur sur une taxonomie du quiz v2) -> m5 (moteur v2 « pur ») ;
--   - parcours q1 restant (au moins une valeur) -> m3 (dernier moteur pondérant les taxonomies q1).
-- Les scorings sans aucune valeur restent NULL (retombent sur la version courante).
UPDATE "user_scoring" us
SET "matching_engine_version" = 'm5'
WHERE EXISTS (
  SELECT 1
  FROM "user_scoring_value" v
  WHERE v."user_scoring_id" = us."id"
    AND v."taxonomy_key" IN (
      'domaine_engagement',
      'rythme',
      'activite',
      'equipe',
      'interaction',
      'autonomie',
      'imprevu',
      'motivation_recherche'
    )
);

UPDATE "user_scoring" us
SET "matching_engine_version" = 'm3'
WHERE us."matching_engine_version" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "user_scoring_value" v
    WHERE v."user_scoring_id" = us."id"
  );
