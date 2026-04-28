import { GATE_TAXONOMIES } from "@engagement/taxonomy";
import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_TAXONOMIES, MATCHING_ENGINE_TOP_RESULTS_LIMIT, MATCHING_ENGINE_VERSIONS } from "./config";
import type { MatchMissionItem, MatchingEngineTaxonomy, MissionMatchingResultItem, RankMissionsByUserScoringInput, RankMissionsByUserScoringResult } from "./types";

type DbRankRow = {
  mission_id: string;
  mission_scoring_id: string;
  total_score: number;
  taxonomy_score: number;
  geo_score: number | null;
  distance_km: number | null;
};

type DbTaxonomyScoreRow = {
  mission_scoring_id: string;
  taxonomy_key: string;
  taxonomy_score: number;
};

type UserScoringStateRow = {
  id: string;
  expires_at: Date | null;
};

const clampScore = (value: number | null): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(Math.max(0, Math.min(1, value as number)).toFixed(6));
};

const TAXONOMY_CANDIDATE_MULTIPLIER = 100;
const MIN_TAXONOMY_CANDIDATE_LIMIT = 1000;
const GEO_CANDIDATE_MULTIPLIER = 50;
const MIN_GEO_CANDIDATE_LIMIT = 1000;
const GEO_PREFILTER_RADIUS_MULTIPLIER = 6;

const getTaxonomyCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * TAXONOMY_CANDIDATE_MULTIPLIER, MIN_TAXONOMY_CANDIDATE_LIMIT);

const getGeoCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * GEO_CANDIDATE_MULTIPLIER, MIN_GEO_CANDIDATE_LIMIT);

const buildTaxonomyWeightsValuesSql = (taxonomyWeights: Record<MatchingEngineTaxonomy, number>) =>
  Prisma.join(MATCHING_ENGINE_TAXONOMIES.map((taxonomy) => Prisma.sql`(${taxonomy}, CAST(${taxonomyWeights[taxonomy]} AS double precision))`));

const buildGateTaxonomiesSql = () => Prisma.join(GATE_TAXONOMIES.map((taxonomy) => Prisma.sql`${taxonomy}`));

const assertUserScoringIsQueryable = async (userScoringId: string): Promise<void> => {
  const rows = await prisma.$queryRaw<UserScoringStateRow[]>`
    SELECT "id", "expires_at"
    FROM "user_scoring"
    WHERE "id" = ${userScoringId}
    LIMIT 1
  `;
  const userScoring = rows[0];

  if (!userScoring) {
    throw new Error(`[matchingEngineService] user_scoring '${userScoringId}' not found.`);
  }

  if (userScoring.expires_at && userScoring.expires_at.getTime() <= Date.now()) {
    throw new Error(`[matchingEngineService] user_scoring '${userScoringId}' is expired.`);
  }
};

const buildRanking = (params: {
  userScoringId: string;
  taxonomyWeights: Record<MatchingEngineTaxonomy, number>;
  taxonomyWeight: number;
  geoWeight: number;
  geoHalfDecayKm: number;
  missingGeoScore: number;
  taxonomyCandidateLimit: number;
  geoCandidateLimit: number;
  limit: number;
  offset: number;
}) => Prisma.sql`
  WITH taxonomy_weights ("taxonomy_key", "taxonomy_weight") AS (
    VALUES ${buildTaxonomyWeightsValuesSql(params.taxonomyWeights)}
  ),
  user_values AS (
    SELECT
      usv."taxonomy_key" AS "taxonomy_key",
      usv."value_key" AS "value_key",
      usv."score"::double precision AS "user_score"
    FROM "user_scoring_value" usv
    WHERE usv."user_scoring_id" = ${params.userScoringId}
      AND usv."taxonomy_key" NOT IN (${buildGateTaxonomiesSql()})
  ),
  user_taxonomy_totals AS (
    SELECT
      uv."taxonomy_key",
      SUM(uv."user_score") AS "taxonomy_total"
    FROM user_values uv
    GROUP BY uv."taxonomy_key"
  ),
  weighted_user_totals AS (
    SELECT
      COALESCE(SUM(udt."taxonomy_total" * COALESCE(dw."taxonomy_weight", 1.0)), 0) AS "taxonomy_total"
    FROM user_taxonomy_totals udt
    LEFT JOIN taxonomy_weights dw
      ON dw."taxonomy_key" = udt."taxonomy_key"
  ),
  active_mission_scorings AS (
    SELECT DISTINCT ON (ms."mission_id")
      ms."id" AS "mission_scoring_id",
      ms."mission_id"
    FROM "mission_scoring" ms
    JOIN "mission_enrichment" me
      ON me."id" = ms."mission_enrichment_id"
     AND me."status" = 'completed'
    JOIN "mission" m
      ON m."id" = ms."mission_id"
    WHERE m."deleted_at" IS NULL
      AND m."status_code" = 'ACCEPTED'
    ORDER BY
      ms."mission_id" ASC,
      me."completed_at" DESC NULLS LAST,
      ms."created_at" DESC,
      ms."id" DESC
  ),
  user_gate_values AS (
    SELECT DISTINCT
      usv."taxonomy_key" AS "taxonomy_key",
      usv."value_key" AS "value_key"
    FROM "user_scoring_value" usv
    WHERE usv."user_scoring_id" = ${params.userScoringId}
      AND usv."taxonomy_key" IN (${buildGateTaxonomiesSql()})
  ),
  mission_gate_values AS (
    SELECT DISTINCT
      ams."mission_scoring_id",
      ams."mission_id",
      msv."taxonomy_key" AS "taxonomy_key",
      msv."value_key" AS "value_key"
    FROM "mission_scoring_value" msv
    JOIN active_mission_scorings ams
      ON ams."mission_scoring_id" = msv."mission_scoring_id"
    WHERE msv."taxonomy_key" IN (${buildGateTaxonomiesSql()})
  ),
  mission_gate_taxonomies AS (
    SELECT DISTINCT
      mgv."mission_scoring_id",
      mgv."taxonomy_key"
    FROM mission_gate_values mgv
  ),
  matched_gate_taxonomies AS (
    SELECT DISTINCT
      mgv."mission_scoring_id",
      mgv."taxonomy_key"
    FROM mission_gate_values mgv
    JOIN user_gate_values ugv
      ON ugv."taxonomy_key" = mgv."taxonomy_key"
     AND ugv."value_key" = mgv."value_key"
  ),
  eligible_mission_scorings AS (
    SELECT
      ams."mission_scoring_id",
      ams."mission_id"
    FROM active_mission_scorings ams
    WHERE NOT EXISTS (
      SELECT 1
      FROM mission_gate_taxonomies mgt
      WHERE mgt."mission_scoring_id" = ams."mission_scoring_id"
        AND NOT EXISTS (
          SELECT 1
          FROM matched_gate_taxonomies mgtm
          WHERE mgtm."mission_scoring_id" = mgt."mission_scoring_id"
            AND mgtm."taxonomy_key" = mgt."taxonomy_key"
        )
    )
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
    JOIN eligible_mission_scorings ems
      ON ems."mission_scoring_id" = msv."mission_scoring_id"
    GROUP BY msv."mission_scoring_id", uv."taxonomy_key"
  ),
  taxonomy_scores AS (
    SELECT
      mv."mission_scoring_id",
      SUM(mv."taxonomy_sum" * COALESCE(dw."taxonomy_weight", 1.0)) AS "weighted_sum"
    FROM matched_values mv
    LEFT JOIN taxonomy_weights dw
      ON dw."taxonomy_key" = mv."taxonomy_key"
    GROUP BY mv."mission_scoring_id"
  ),
  taxonomy_candidates AS (
    SELECT
      ems."mission_id",
      ems."mission_scoring_id"
    FROM taxonomy_scores ts
    JOIN eligible_mission_scorings ems
      ON ems."mission_scoring_id" = ts."mission_scoring_id"
    CROSS JOIN weighted_user_totals ut
    WHERE ut."taxonomy_total" > 0
    ORDER BY ts."weighted_sum" / ut."taxonomy_total" DESC, ems."mission_id" ASC
    LIMIT ${params.taxonomyCandidateLimit}
  ),
  user_geo AS (
    SELECT
      usg."lat",
      usg."lon",
      usg."radius_km"
    FROM "user_scoring_geo" usg
    WHERE usg."user_scoring_id" = ${params.userScoringId}
    LIMIT 1
  ),
  geo_prefilter_settings AS (
    SELECT
      ug."lat",
      ug."lon",
      GREATEST(
        COALESCE(NULLIF(ug."radius_km", 0)::double precision, 0.0),
        CAST(${params.geoHalfDecayKm} AS double precision) * CAST(${GEO_PREFILTER_RADIUS_MULTIPLIER} AS double precision)
      ) AS "radius_km",
      GREATEST(
        COALESCE(NULLIF(ug."radius_km", 0)::double precision, 0.0),
        CAST(${params.geoHalfDecayKm} AS double precision) * CAST(${GEO_PREFILTER_RADIUS_MULTIPLIER} AS double precision)
      ) / 111.0 AS "lat_delta",
      GREATEST(
        COALESCE(NULLIF(ug."radius_km", 0)::double precision, 0.0),
        CAST(${params.geoHalfDecayKm} AS double precision) * CAST(${GEO_PREFILTER_RADIUS_MULTIPLIER} AS double precision)
      ) / NULLIF(
        111.320 * GREATEST(ABS(COS(RADIANS(ug."lat"))), 0.01),
        0.0
      ) AS "lon_delta"
    FROM user_geo ug
  ),
  geo_candidates AS (
    SELECT
      ems."mission_id",
      ems."mission_scoring_id",
      MIN(
        6371.0 * 2.0 * ASIN(
          SQRT(
            POWER(SIN(RADIANS(ma."location_lat" - gps."lat") / 2.0), 2) +
            COS(RADIANS(gps."lat")) * COS(RADIANS(ma."location_lat")) *
            POWER(SIN(RADIANS(ma."location_lon" - gps."lon") / 2.0), 2)
          )
        )
      ) AS "distance_km"
    FROM geo_prefilter_settings gps
    JOIN "mission_address" ma
      ON ma."location_lat" IS NOT NULL
     AND ma."location_lon" IS NOT NULL
     AND ma."location_lat" BETWEEN gps."lat" - gps."lat_delta" AND gps."lat" + gps."lat_delta"
     AND ma."location_lon" BETWEEN gps."lon" - gps."lon_delta" AND gps."lon" + gps."lon_delta"
    JOIN eligible_mission_scorings ems
      ON ems."mission_id" = ma."mission_id"
    GROUP BY ems."mission_id", ems."mission_scoring_id"
    ORDER BY
      "distance_km" ASC,
      ems."mission_id" ASC
    LIMIT ${params.geoCandidateLimit}
  ),
  fallback_geo_candidates AS (
    SELECT
      ems."mission_id",
      ems."mission_scoring_id",
      MIN(
        6371.0 * 2.0 * ASIN(
          SQRT(
            POWER(SIN(RADIANS(ma."location_lat" - ug."lat") / 2.0), 2) +
            COS(RADIANS(ug."lat")) * COS(RADIANS(ma."location_lat")) *
            POWER(SIN(RADIANS(ma."location_lon" - ug."lon") / 2.0), 2)
          )
        )
      ) AS "distance_km"
    FROM user_geo ug
    JOIN "mission_address" ma
      ON ma."location_lat" IS NOT NULL
     AND ma."location_lon" IS NOT NULL
    JOIN eligible_mission_scorings ems
      ON ems."mission_id" = ma."mission_id"
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy_candidates)
      AND NOT EXISTS (SELECT 1 FROM geo_candidates)
    GROUP BY ems."mission_id", ems."mission_scoring_id"
    ORDER BY
      "distance_km" ASC,
      ems."mission_id" ASC
    LIMIT ${params.geoCandidateLimit}
  ),
  fallback_candidates AS (
    SELECT
      ems."mission_id",
      ems."mission_scoring_id"
    FROM eligible_mission_scorings ems
    CROSS JOIN weighted_user_totals ut
    WHERE ut."taxonomy_total" = 0
      AND NOT EXISTS (SELECT 1 FROM user_geo)
    ORDER BY ems."mission_id" ASC
    LIMIT ${params.offset + params.limit}
  ),
  candidate_missions AS (
    SELECT
      tc."mission_id",
      tc."mission_scoring_id",
      CAST(NULL AS double precision) AS "distance_km"
    FROM taxonomy_candidates tc
    UNION
    SELECT
      gc."mission_id",
      gc."mission_scoring_id",
      gc."distance_km"
    FROM geo_candidates gc
    UNION
    SELECT
      fgc."mission_id",
      fgc."mission_scoring_id",
      fgc."distance_km"
    FROM fallback_geo_candidates fgc
    UNION
    SELECT
      fc."mission_id",
      fc."mission_scoring_id",
      CAST(NULL AS double precision) AS "distance_km"
    FROM fallback_candidates fc
  ),
  geo_scores AS (
    SELECT
      cm."mission_scoring_id",
      COALESCE(cm."distance_km", geo."distance_km") AS "distance_km"
    FROM candidate_missions cm
    LEFT JOIN LATERAL (
      SELECT
        MIN(
          6371.0 * 2.0 * ASIN(
            SQRT(
              POWER(SIN(RADIANS(ma."location_lat" - ug."lat") / 2.0), 2) +
              COS(RADIANS(ug."lat")) * COS(RADIANS(ma."location_lat")) *
              POWER(SIN(RADIANS(ma."location_lon" - ug."lon") / 2.0), 2)
            )
          )
        ) AS "distance_km"
      FROM user_geo ug
      JOIN "mission_address" ma
        ON ma."mission_id" = cm."mission_id"
       AND ma."location_lat" IS NOT NULL
       AND ma."location_lon" IS NOT NULL
      WHERE cm."distance_km" IS NULL
    ) geo ON TRUE
  ),
  ranked AS (
    SELECT
      cm."mission_id",
      cm."mission_scoring_id",
      CASE
        WHEN ut."taxonomy_total" > 0 THEN COALESCE(ts."weighted_sum", 0) / ut."taxonomy_total"
        ELSE 0
      END AS "taxonomy_score",
      CASE
        WHEN EXISTS (SELECT 1 FROM user_geo) THEN
          CASE
            WHEN gs."distance_km" IS NULL THEN CAST(${params.missingGeoScore} AS double precision)
            ELSE EXP(-LN(2) * gs."distance_km" / NULLIF(CAST(${params.geoHalfDecayKm} AS double precision), 0.0))
          END
        ELSE NULL
      END AS "geo_score",
      gs."distance_km"
    FROM candidate_missions cm
    CROSS JOIN weighted_user_totals ut
    LEFT JOIN taxonomy_scores ts
      ON ts."mission_scoring_id" = cm."mission_scoring_id"
    LEFT JOIN geo_scores gs
      ON gs."mission_scoring_id" = cm."mission_scoring_id"
  )
  SELECT
    r."mission_id",
    r."mission_scoring_id",
    CASE
      WHEN r."geo_score" IS NULL THEN r."taxonomy_score"
      ELSE (
        (CAST(${params.taxonomyWeight} AS double precision) * r."taxonomy_score") +
        (CAST(${params.geoWeight} AS double precision) * r."geo_score")
      ) / NULLIF(
        CAST(${params.taxonomyWeight} AS double precision) + CAST(${params.geoWeight} AS double precision),
        0.0
      )
    END AS "total_score",
    r."taxonomy_score",
    r."geo_score",
    r."distance_km"
  FROM ranked r
  ORDER BY "total_score" DESC, r."mission_id" ASC
  LIMIT ${params.limit}
  OFFSET ${params.offset}
`;

const buildTaxonomyScoresSql = (params: { userScoringId: string; missionScoringIds: string[] }) => Prisma.sql`
  WITH user_values AS (
    SELECT
      usv."taxonomy_key" AS "taxonomy_key",
      usv."value_key" AS "value_key",
      usv."score"::double precision AS "user_score"
    FROM "user_scoring_value" usv
    WHERE usv."user_scoring_id" = ${params.userScoringId}
      AND usv."taxonomy_key" NOT IN (${buildGateTaxonomiesSql()})
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
      WHEN udt."taxonomy_total" > 0 THEN mv."taxonomy_sum" / udt."taxonomy_total"
      ELSE 0
    END AS "taxonomy_score"
  FROM matched_values mv
  JOIN user_taxonomy_totals udt
    ON udt."taxonomy_key" = mv."taxonomy_key"
`;

const buildTaxonomyScoresIndex = (rows: DbTaxonomyScoreRow[]): Record<string, Partial<Record<MatchingEngineTaxonomy, number>>> => {
  const taxonomySet = new Set<string>(MATCHING_ENGINE_TAXONOMIES);
  const result: Record<string, Partial<Record<MatchingEngineTaxonomy, number>>> = {};

  for (const row of rows) {
    if (!taxonomySet.has(row.taxonomy_key)) {
      continue;
    }

    const missionScoringId = row.mission_scoring_id;
    const taxonomy = row.taxonomy_key as MatchingEngineTaxonomy;

    if (!result[missionScoringId]) {
      result[missionScoringId] = {};
    }

    result[missionScoringId][taxonomy] = clampScore(Number(row.taxonomy_score));
  }

  return result;
};

const buildMissionMatchingResultItems = (params: {
  rows: DbRankRow[];
  taxonomyScoresByMissionScoringId: Record<string, Partial<Record<MatchingEngineTaxonomy, number>>>;
}): MissionMatchingResultItem[] =>
  params.rows.map((row) => ({
    missionScoringId: row.mission_scoring_id,
    taxonomyScores: params.taxonomyScoresByMissionScoringId[row.mission_scoring_id] ?? {},
  }));

export const matchingEngineService = {
  async rankMissionsByUserScoring(input: RankMissionsByUserScoringInput): Promise<RankMissionsByUserScoringResult> {
    const startedAt = Date.now();
    const version = input.version ?? CURRENT_MATCHING_ENGINE_VERSION;
    const taxonomyWeights = MATCHING_ENGINE_VERSIONS[version].taxonomyWeights;
    const limit = Math.max(1, Math.min(500, input.limit ?? 20));
    const offset = Math.max(0, input.offset ?? 0);
    // The persisted snapshot is defined as the first page of the ranking.
    const shouldPersistTopResults = offset === 0;
    const rankingLimit = shouldPersistTopResults ? Math.max(limit, MATCHING_ENGINE_TOP_RESULTS_LIMIT) : limit;
    const taxonomyWeight = input.taxonomyWeight ?? 0.3;
    const geoWeight = input.geoWeight ?? 0.7;
    const geoHalfDecayKm = input.geoHalfDecayKm ?? 20;
    const missingGeoScore = input.missingGeoScore ?? 0.1;
    const taxonomyCandidateLimit = getTaxonomyCandidateLimit({ limit: rankingLimit, offset });
    const geoCandidateLimit = getGeoCandidateLimit({ limit: rankingLimit, offset });

    await assertUserScoringIsQueryable(input.userScoringId);

    const rows = await prisma.$queryRaw<DbRankRow[]>(
      buildRanking({
        userScoringId: input.userScoringId,
        taxonomyWeights,
        taxonomyWeight,
        geoWeight,
        geoHalfDecayKm,
        missingGeoScore,
        taxonomyCandidateLimit,
        geoCandidateLimit,
        limit: rankingLimit,
        offset,
      })
    );
    const missionScoringIdsForDetails = rows.slice(0, MATCHING_ENGINE_TOP_RESULTS_LIMIT).map((row) => row.mission_scoring_id);
    const taxonomyScoresRows =
      missionScoringIdsForDetails.length > 0
        ? await prisma.$queryRaw<DbTaxonomyScoreRow[]>(
            buildTaxonomyScoresSql({
              userScoringId: input.userScoringId,
              missionScoringIds: missionScoringIdsForDetails,
            })
          )
        : [];
    const taxonomyScoresByMissionScoringId = buildTaxonomyScoresIndex(taxonomyScoresRows);
    const responseRows = shouldPersistTopResults ? rows.slice(0, limit) : rows;

    if (shouldPersistTopResults) {
      await missionMatchingResultRepository.createForUserScoringVersion({
        userScoringId: input.userScoringId,
        matchingEngineVersion: version,
        results: buildMissionMatchingResultItems({
          rows: rows.slice(0, MATCHING_ENGINE_TOP_RESULTS_LIMIT),
          taxonomyScoresByMissionScoringId,
        }),
      });
    }

    return {
      items: responseRows.map(
        (row): MatchMissionItem => ({
          missionId: row.mission_id,
          missionScoringId: row.mission_scoring_id,
          totalScore: clampScore(Number(row.total_score)),
          taxonomyScore: clampScore(Number(row.taxonomy_score)),
          geoScore: row.geo_score === null ? null : clampScore(Number(row.geo_score)),
          distanceKm: row.distance_km === null ? null : Number(row.distance_km),
          taxonomyScores: taxonomyScoresByMissionScoringId[row.mission_scoring_id] ?? {},
        })
      ),
      tookMs: Date.now() - startedAt,
    };
  },
};

export default matchingEngineService;
