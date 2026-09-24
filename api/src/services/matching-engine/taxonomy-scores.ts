import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { MATCHING_ENGINE_TAXONOMIES } from "./config";
import { clampScore } from "./score-utils";
import type { MatchingEngineTaxonomy } from "./types";

type DbTaxonomyScoreRow = {
  mission_scoring_id: string;
  taxonomy_key: string;
  taxonomy_score: number;
};

export type TaxonomyScoresByMission = Record<string, Partial<Record<MatchingEngineTaxonomy, number>>>;

/**
 * Recalcule le détail par taxonomie pour les seules missions retournées ou persistées.
 *
 * La requête principale ne conserve que le score taxonomique agrégé pour rester compacte. Cette
 * seconde requête fournit le détail nécessaire à l'explication du résultat et au snapshot.
 */
const buildTaxonomyScoresQuery = (params: {
  userScoringId: string;
  missionScoringIds: string[];
  taxonomyKeys: readonly MatchingEngineTaxonomy[];
  taxonomyOrBaseScore: number;
}) => Prisma.sql`
  WITH user_values AS (
    SELECT
      usv."taxonomy_key" AS "taxonomy_key",
      usv."value_key" AS "value_key",
      usv."score"::double precision AS "user_score"
    FROM "user_scoring_value" usv
    WHERE usv."user_scoring_id" = ${params.userScoringId}
      AND usv."taxonomy_key" IN (${Prisma.join(params.taxonomyKeys)})
  ),
  user_taxonomy_totals AS (
    SELECT
      uv."taxonomy_key",
      SUM(uv."user_score") AS "taxonomy_total"
    FROM user_values uv
    GROUP BY uv."taxonomy_key"
  ),
  matched_values AS (
    SELECT
      msv."mission_scoring_id",
      uv."taxonomy_key",
      SUM(uv."user_score" * msv."score") AS "taxonomy_sum"
    FROM user_values uv
    JOIN "mission_scoring_value" msv
      ON msv."taxonomy_key" = uv."taxonomy_key"
     AND msv."value_key" = uv."value_key"
    WHERE msv."mission_scoring_id" IN (${Prisma.join(params.missionScoringIds)})
    GROUP BY msv."mission_scoring_id", uv."taxonomy_key"
  )
  SELECT
    mv."mission_scoring_id",
    mv."taxonomy_key",
    CASE
      WHEN udt."taxonomy_total" > 0 THEN
        CAST(${params.taxonomyOrBaseScore} AS double precision) +
        ((1.0 - CAST(${params.taxonomyOrBaseScore} AS double precision)) * LEAST(mv."taxonomy_sum" / udt."taxonomy_total", 1.0))
      ELSE 0
    END AS "taxonomy_score"
  FROM matched_values mv
  JOIN user_taxonomy_totals udt
    ON udt."taxonomy_key" = mv."taxonomy_key"
`;

const indexTaxonomyScores = (rows: DbTaxonomyScoreRow[]): TaxonomyScoresByMission => {
  const knownTaxonomies = new Set<string>(MATCHING_ENGINE_TAXONOMIES);
  const result: TaxonomyScoresByMission = {};

  for (const row of rows) {
    // Protège le contrat TypeScript si la base contient une ancienne taxonomie inconnue du code.
    if (!knownTaxonomies.has(row.taxonomy_key)) {
      continue;
    }

    const missionScoringId = row.mission_scoring_id;
    const taxonomy = row.taxonomy_key as MatchingEngineTaxonomy;
    result[missionScoringId] ??= {};
    result[missionScoringId][taxonomy] = clampScore(Number(row.taxonomy_score));
  }

  return result;
};

export const loadTaxonomyScores = async (params: {
  userScoringId: string;
  missionScoringIds: string[];
  taxonomyKeys: readonly MatchingEngineTaxonomy[];
  taxonomyOrBaseScore: number;
}): Promise<TaxonomyScoresByMission> => {
  if (params.missionScoringIds.length === 0) {
    return {};
  }

  const rows = await prisma.$queryRaw<DbTaxonomyScoreRow[]>(buildTaxonomyScoresQuery(params));
  return indexTaxonomyScores(rows);
};
