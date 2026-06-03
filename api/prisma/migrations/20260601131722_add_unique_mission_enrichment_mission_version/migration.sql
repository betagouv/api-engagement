-- Dédup avant contrainte : garde, par (mission_id, prompt_version), la ligne « gagnante » du
-- matching (même ordre que le CTE active_mission_scorings : completed_at DESC NULLS LAST,
-- created_at DESC, id DESC) et supprime les doublons. Le cascade DB nettoie automatiquement
-- mission_enrichment_value, mission_scoring et mission_scoring_value rattachés.
-- En prod : lancer d'abord scripts/purge-duplicate-mission-enrichments.ts (batché) pour que ce
-- DELETE soit quasi no-op ; en CI/dev (base vierge) il est no-op.
DELETE FROM "mission_enrichment" me
USING (
  SELECT "id",
    ROW_NUMBER() OVER (
      PARTITION BY "mission_id", "prompt_version"
      ORDER BY "completed_at" DESC NULLS LAST, "created_at" DESC, "id" DESC
    ) AS rn
  FROM "mission_enrichment"
) ranked
WHERE me."id" = ranked."id" AND ranked.rn > 1;

-- L'index non-unique (mission_id, prompt_version) devient redondant avec la contrainte unique.
DROP INDEX IF EXISTS "mission_enrichment_mission_version_idx";

-- L'unique PARTIEL (WHERE status IN ('pending','processing')) est subsumé par l'unique complet.
DROP INDEX IF EXISTS "mission_enrichment_inflight_unique";

-- Contrainte unique COMPLÈTE : au plus une ligne par (mission, version), tous statuts confondus.
-- En prod, préférer un build en ligne :
--   CREATE UNIQUE INDEX CONCURRENTLY "mission_enrichment_mission_version_unique"
--     ON "mission_enrichment" ("mission_id", "prompt_version");
-- puis `prisma migrate resolve --applied 20260601131722_add_unique_mission_enrichment_mission_version`.
CREATE UNIQUE INDEX "mission_enrichment_mission_version_unique"
  ON "mission_enrichment" ("mission_id", "prompt_version");
