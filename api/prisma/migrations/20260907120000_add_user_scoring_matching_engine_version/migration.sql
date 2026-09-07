-- Fige le moteur de matching par user_scoring : les résultats d'un scoring restent scorés par ce
-- moteur et ne suivent plus la version active (CURRENT_MATCHING_ENGINE_VERSION).
ALTER TABLE "user_scoring" ADD COLUMN "matching_engine_version" TEXT;

-- Backfill déterministe des scorings existants (réplique inferMatchingEngineVersion, cf. config.ts) :
-- on réserve le moteur q1 (m3) aux scorings identifiables q1 — au moins une taxonomie q1 et AUCUNE
-- taxonomie q2 — puis on rattache tout le reste (q2, q2 partiel, géo-only, sans réponse) à la version
-- active (m5). Sans régression : m5 est déjà la version active en staging et production.
UPDATE "user_scoring" us
SET "matching_engine_version" = 'm3'
WHERE EXISTS (
  SELECT 1
  FROM "user_scoring_value" v
  WHERE v."user_scoring_id" = us."id"
    AND v."taxonomy_key" IN (
      'domaine',
      'secteur_activite',
      'type_mission',
      'competence_rome',
      'region_internationale',
      'engagement_intent',
      'formation_onisep'
    )
)
AND NOT EXISTS (
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

UPDATE "user_scoring"
SET "matching_engine_version" = 'm5'
WHERE "matching_engine_version" IS NULL;
