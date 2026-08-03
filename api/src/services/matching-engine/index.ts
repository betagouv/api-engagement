import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import { GATE_TAXONOMIES } from "@engagement/taxonomy";
import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_TAXONOMIES, MATCHING_ENGINE_TOP_RESULTS_LIMIT, MATCHING_ENGINE_VERSIONS } from "./config";
import type {
  GeoRadiusScoreMode,
  MatchMissionItem,
  MatchingEngineTaxonomy,
  MatchingEngineTaxonomyWeights,
  MissionMatchingResultItem,
  RankMissionsByUserScoringInput,
  RankMissionsByUserScoringResult,
} from "./types";

type DbRankRow = {
  mission_id: string;
  mission_scoring_id: string;
  total_score: number;
  taxonomy_score: number;
  geo_score: number | null;
  distance_km: number | null;
  closest_lat: number | null;
  closest_lon: number | null;
  closest_address_id: string | null;
  closest_city: string | null;
  closest_address: string | null;
  total_count: number | bigint;
};

type DbTaxonomyScoreRow = {
  mission_scoring_id: string;
  taxonomy_key: string;
  taxonomy_score: number;
};

type UserScoringStateRow = {
  id: string;
};

const clampScore = (value: number | null): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(Math.max(0, Math.min(1, value as number)).toFixed(6));
};

const nullableNumber = (value: number | null | undefined): number | null => (value == null ? null : Number(value));

const TAXONOMY_CANDIDATE_MULTIPLIER = 100;
const MIN_TAXONOMY_CANDIDATE_LIMIT = 1000;
const GEO_CANDIDATE_MULTIPLIER = 50;
const MIN_GEO_CANDIDATE_LIMIT = 1000;
const GEO_PREFILTER_RADIUS_MULTIPLIER = 6;
const TAXONOMY_OR_BASE_SCORE = 0.8;

const getTaxonomyCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * TAXONOMY_CANDIDATE_MULTIPLIER, MIN_TAXONOMY_CANDIDATE_LIMIT);

const getGeoCandidateLimit = (params: { limit: number; offset: number }): number =>
  Math.max(params.offset + params.limit, params.limit * GEO_CANDIDATE_MULTIPLIER, MIN_GEO_CANDIDATE_LIMIT);

const buildTaxonomyWeightsValuesSql = (taxonomyWeights: Readonly<MatchingEngineTaxonomyWeights>) =>
  Prisma.join(
    Object.entries(taxonomyWeights).map(([taxonomy, weight]) => Prisma.sql`(${taxonomy}, CAST(${weight} AS double precision))`)
  );

const buildGateTaxonomiesSql = () => Prisma.join(GATE_TAXONOMIES.map((taxonomy) => Prisma.sql`${taxonomy}`));

const assertUserScoringExists = async (userScoringId: string): Promise<void> => {
  const rows = await prisma.$queryRaw<UserScoringStateRow[]>`
    SELECT "id"
    FROM "user_scoring"
    WHERE "id" = ${userScoringId}
    LIMIT 1
  `;
  const userScoring = rows[0];

  if (!userScoring) {
    throw new Error(`[matchingEngineService] user_scoring '${userScoringId}' not found.`);
  }
};

const buildRanking = (params: {
  userScoringId: string;
  publisherDiffusionJoinSql?: Prisma.Sql;
  taxonomyWeights: Readonly<MatchingEngineTaxonomyWeights>;
  taxonomyWeight: number;
  geoWeight: number;
  geoHalfDecayKm: number;
  missingGeoScore: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
  geoRadiusScoreMode: GeoRadiusScoreMode;
  taxonomyCandidateLimit: number;
  geoCandidateLimit: number;
  limit: number;
  offset: number;
}) => {
  // Missions remote=full/local : proximité naturelle (score géo forcé), uniquement si la version l'active.
  const forcedRemoteActive = params.remoteFullGeoScore != null || params.remoteLocalGeoScore != null;
  const remoteFullGeoScoreSql =
    params.remoteFullGeoScore == null ? Prisma.empty : Prisma.sql`WHEN m."remote"::text = 'full' THEN CAST(${params.remoteFullGeoScore} AS double precision)`;
  const remoteLocalGeoScoreSql =
    params.remoteLocalGeoScore == null ? Prisma.empty : Prisma.sql`WHEN m."remote"::text = 'local' THEN CAST(${params.remoteLocalGeoScore} AS double precision)`;
  const legacyDistanceGeoScoreSql = Prisma.sql`EXP(-LN(2) * gs."distance_km" / NULLIF(CAST(${params.geoHalfDecayKm} AS double precision), 0.0))`;
  const distanceGeoScoreSql =
    params.geoRadiusScoreMode === "linear-cutoff"
      ? Prisma.sql`
        CASE
          WHEN NULLIF(ug."radius_km", 0) IS NULL THEN ${legacyDistanceGeoScoreSql}
          WHEN gs."distance_km" >= ug."radius_km" THEN 0.0
          ELSE GREATEST(0.0, 1.0 - (gs."distance_km" / ug."radius_km"))
        END`
      : legacyDistanceGeoScoreSql;

  // Quand le boost remote est actif et que l'utilisateur est géolocalisé, les missions remote=full/local éligibles
  // doivent entrer dans le pool candidat même sans match taxonomie ni adresse proche : elles sont "partout".
  const forcedRemoteCandidatesCteSql = !forcedRemoteActive
    ? Prisma.empty
    : Prisma.sql`
  remote_missions AS (
    SELECT
      ems."mission_id",
      ems."mission_scoring_id"
    FROM eligible_mission_scorings ems
    JOIN "mission" m
      ON m."id" = ems."mission_id"
     AND m."remote"::text IN ('full', 'local')
    WHERE EXISTS (SELECT 1 FROM user_geo)
  ),
  unscored_remote_missions AS (
    SELECT
      rm."mission_id",
      rm."mission_scoring_id"
    FROM remote_missions rm
    EXCEPT
    SELECT
      ts."mission_id",
      ts."mission_scoring_id"
    FROM taxonomy_scores ts
  ),
  forced_remote_candidates AS (
    SELECT
      rc."mission_id",
      rc."mission_scoring_id",
      rc."weighted_sum"
    FROM (
      SELECT
        ts."mission_id",
        ts."mission_scoring_id",
        ts."weighted_sum" AS "weighted_sum"
      FROM taxonomy_scores ts
      JOIN "mission" m
        ON m."id" = ts."mission_id"
       AND m."remote"::text IN ('full', 'local')
      WHERE EXISTS (SELECT 1 FROM user_geo)
      UNION ALL
      SELECT
        urm."mission_id",
        urm."mission_scoring_id",
        CAST(0 AS double precision) AS "weighted_sum"
      FROM unscored_remote_missions urm
    ) rc
    ORDER BY rc."weighted_sum" DESC, rc."mission_id" ASC
    LIMIT ${params.geoCandidateLimit}
  ),`;
  const forcedRemoteCandidatesUnionSql = !forcedRemoteActive
    ? Prisma.empty
    : Prisma.sql`
    UNION ALL
    SELECT
      rfc."mission_id",
      rfc."mission_scoring_id",
      CAST(NULL AS double precision) AS "distance_km",
      rfc."weighted_sum"
    FROM forced_remote_candidates rfc`;

  // Une mission remote=full/local ignore toute adresse : on nullifie distance/closest_* pour ne pas polluer
  // l'affichage ni avgDistanceKmTop5, y compris quand elle a une adresse géocodée.
  const rankedGeoColumnsSql = !forcedRemoteActive
    ? Prisma.sql`
      gs."distance_km",
      gs."closest_lat",
      gs."closest_lon",
      gs."closest_address_id",
      gs."closest_city",
      gs."closest_address"`
    : Prisma.sql`
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."distance_km" END AS "distance_km",
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."closest_lat" END AS "closest_lat",
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."closest_lon" END AS "closest_lon",
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."closest_address_id" END AS "closest_address_id",
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."closest_city" END AS "closest_city",
      CASE WHEN m."remote"::text IN ('full', 'local') THEN NULL ELSE gs."closest_address" END AS "closest_address"`;

  return Prisma.sql`
  WITH taxonomy_weights ("taxonomy_key", "taxonomy_weight") AS (
    VALUES ${buildTaxonomyWeightsValuesSql(params.taxonomyWeights)}
  ),
  user_values AS (
    SELECT
      usv."taxonomy_key" AS "taxonomy_key",
      usv."value_key" AS "value_key",
      usv."score"::double precision AS "user_score"
    FROM "user_scoring_value" usv
    JOIN taxonomy_weights tw
      ON tw."taxonomy_key" = usv."taxonomy_key"
    WHERE usv."user_scoring_id" = ${params.userScoringId}
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
      COALESCE(SUM(COALESCE(dw."taxonomy_weight", 1.0)), 0) AS "taxonomy_total"
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
    ${params.publisherDiffusionJoinSql ?? Prisma.empty}
    WHERE m."deleted_at" IS NULL
      AND m."status_code" = 'ACCEPTED'
    ORDER BY
      ms."mission_id" ASC,
      (me."prompt_version" = ${CURRENT_PROMPT_VERSION}) DESC,
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
      ems."mission_id",
      msv."mission_scoring_id",
      uv."taxonomy_key",
      SUM(uv."user_score" * msv."score") AS "taxonomy_sum"
    FROM user_values uv
    JOIN "mission_scoring_value" msv
      ON msv."taxonomy_key" = uv."taxonomy_key"
     AND msv."value_key" = uv."value_key"
    JOIN eligible_mission_scorings ems
      ON ems."mission_scoring_id" = msv."mission_scoring_id"
    GROUP BY ems."mission_id", msv."mission_scoring_id", uv."taxonomy_key"
  ),
  taxonomy_scores AS (
    SELECT
      mv."mission_id",
      mv."mission_scoring_id",
      SUM(
        (
          CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision) +
          ((1.0 - CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision)) * LEAST(mv."taxonomy_sum" / NULLIF(udt."taxonomy_total", 0), 1.0))
        ) * COALESCE(dw."taxonomy_weight", 1.0)
      ) AS "weighted_sum"
    FROM matched_values mv
    JOIN user_taxonomy_totals udt
      ON udt."taxonomy_key" = mv."taxonomy_key"
    LEFT JOIN taxonomy_weights dw
      ON dw."taxonomy_key" = mv."taxonomy_key"
    GROUP BY mv."mission_id", mv."mission_scoring_id"
  ),
  taxonomy_candidates AS (
    SELECT
      ts."mission_id",
      ts."mission_scoring_id",
      ts."weighted_sum"
    FROM taxonomy_scores ts
    CROSS JOIN weighted_user_totals ut
    WHERE ut."taxonomy_total" > 0
    ORDER BY ts."weighted_sum" / ut."taxonomy_total" DESC, ts."mission_id" ASC
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
  ),${forcedRemoteCandidatesCteSql}
  geographic_candidates AS (
    SELECT
      gc."mission_id",
      gc."mission_scoring_id",
      gc."distance_km"
    FROM geo_candidates gc
    UNION ALL
    SELECT
      fgc."mission_id",
      fgc."mission_scoring_id",
      fgc."distance_km"
    FROM fallback_geo_candidates fgc
  ),
  geographic_candidate_scores AS (
    SELECT
      gc."mission_id",
      gc."mission_scoring_id",
      gc."distance_km",
      COALESCE(SUM(
        (
          CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision) +
          ((1.0 - CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision)) * LEAST(gmv."taxonomy_sum" / NULLIF(udt."taxonomy_total", 0), 1.0))
        ) * COALESCE(dw."taxonomy_weight", 1.0)
      ) FILTER (WHERE gmv."taxonomy_key" IS NOT NULL), 0) AS "weighted_sum"
    FROM geographic_candidates gc
    LEFT JOIN LATERAL (
      SELECT
        uv."taxonomy_key",
        SUM(uv."user_score" * msv."score") AS "taxonomy_sum"
      FROM user_values uv
      JOIN "mission_scoring_value" msv
        ON msv."taxonomy_key" = uv."taxonomy_key"
       AND msv."value_key" = uv."value_key"
       AND msv."mission_scoring_id" = gc."mission_scoring_id"
      GROUP BY uv."taxonomy_key"
    ) gmv ON TRUE
    LEFT JOIN user_taxonomy_totals udt
      ON udt."taxonomy_key" = gmv."taxonomy_key"
    LEFT JOIN taxonomy_weights dw
      ON dw."taxonomy_key" = gmv."taxonomy_key"
    GROUP BY gc."mission_id", gc."mission_scoring_id", gc."distance_km"
  ),
  candidate_mission_rows AS (
    SELECT
      tc."mission_id",
      tc."mission_scoring_id",
      CAST(NULL AS double precision) AS "distance_km",
      tc."weighted_sum"
    FROM taxonomy_candidates tc
    UNION ALL
    SELECT
      gcs."mission_id",
      gcs."mission_scoring_id",
      gcs."distance_km",
      gcs."weighted_sum"
    FROM geographic_candidate_scores gcs
    UNION ALL
    SELECT
      fc."mission_id",
      fc."mission_scoring_id",
      CAST(NULL AS double precision) AS "distance_km",
      CAST(0 AS double precision) AS "weighted_sum"
    FROM fallback_candidates fc${forcedRemoteCandidatesUnionSql}
  ),
  candidate_missions AS (
    SELECT
      cmr."mission_id",
      cmr."mission_scoring_id",
      MIN(cmr."distance_km") AS "distance_km",
      MAX(cmr."weighted_sum") AS "weighted_sum"
    FROM candidate_mission_rows cmr
    GROUP BY cmr."mission_id", cmr."mission_scoring_id"
  ),
  geo_scores AS (
    SELECT
      cm."mission_scoring_id",
      COALESCE(cm."distance_km", closest."distance_km") AS "distance_km",
      closest."closest_lat",
      closest."closest_lon",
      closest."closest_address_id",
      closest."closest_city",
      closest."closest_address"
    FROM candidate_missions cm
    LEFT JOIN LATERAL (
      SELECT
        6371.0 * 2.0 * ASIN(
          SQRT(
            POWER(SIN(RADIANS(ma."location_lat" - ug."lat") / 2.0), 2) +
            COS(RADIANS(ug."lat")) * COS(RADIANS(ma."location_lat")) *
            POWER(SIN(RADIANS(ma."location_lon" - ug."lon") / 2.0), 2)
          )
        ) AS "distance_km",
        ma."location_lat" AS "closest_lat",
        ma."location_lon" AS "closest_lon",
        ma."id" AS "closest_address_id",
        ma."city" AS "closest_city",
        NULLIF(
          CONCAT_WS(
            ', ',
            NULLIF(ma."street", ''),
            NULLIF(CONCAT_WS(' ', NULLIF(ma."postal_code", ''), NULLIF(ma."city", '')), ''),
            NULLIF(ma."country", '')
          ),
          ''
        ) AS "closest_address"
      FROM user_geo ug
      CROSS JOIN "mission_address" ma
      WHERE ma."mission_id" = cm."mission_id"
        AND ma."location_lat" IS NOT NULL
        AND ma."location_lon" IS NOT NULL
      ORDER BY "distance_km" ASC, ma."created_at" ASC, ma."id" ASC
      LIMIT 1
    ) closest ON TRUE
  ),
  ranked AS (
    SELECT
      cm."mission_id",
      cm."mission_scoring_id",
      CASE
        WHEN ut."taxonomy_total" > 0 THEN cm."weighted_sum" / ut."taxonomy_total"
        ELSE 0
      END AS "taxonomy_score",
      CASE
        WHEN ug."lat" IS NOT NULL THEN
          CASE
            ${remoteFullGeoScoreSql}
            ${remoteLocalGeoScoreSql}
            WHEN gs."distance_km" IS NULL THEN CAST(${params.missingGeoScore} AS double precision)
            ELSE ${distanceGeoScoreSql}
          END
        ELSE NULL
      END AS "geo_score",${rankedGeoColumnsSql}
    FROM candidate_missions cm
    CROSS JOIN weighted_user_totals ut
    JOIN "mission" m
      ON m."id" = cm."mission_id"
    LEFT JOIN geo_scores gs
      ON gs."mission_scoring_id" = cm."mission_scoring_id"
    LEFT JOIN user_geo ug
      ON TRUE
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
    r."distance_km",
    r."closest_lat",
    r."closest_lon",
    r."closest_address_id",
    r."closest_city",
    r."closest_address",
    -- Total des missions classées pour cet utilisateur (avant pagination), borné par le pool de candidats.
    COUNT(*) OVER () AS "total_count"
  FROM ranked r
  ORDER BY "total_score" DESC, r."mission_id" ASC
  LIMIT ${params.limit}
  OFFSET ${params.offset}
`;
};

const buildPublisherDiffusionJoinSql = (publisherId?: string): Prisma.Sql => {
  if (!publisherId) {
    return Prisma.empty;
  }

  return Prisma.sql`JOIN "mission_diffusion" md
    ON md."mission_id" = m."id"
   AND md."distribution_publisher_id" = ${publisherId}`;
};

const buildTaxonomyScoresSql = (params: { userScoringId: string; missionScoringIds: string[]; taxonomyKeys: readonly MatchingEngineTaxonomy[] }) => Prisma.sql`
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
        CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision) +
        ((1.0 - CAST(${TAXONOMY_OR_BASE_SCORE} AS double precision)) * LEAST(mv."taxonomy_sum" / udt."taxonomy_total", 1.0))
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
    missionAddressId: row.closest_address_id ?? null,
    taxonomyScores: params.taxonomyScoresByMissionScoringId[row.mission_scoring_id] ?? {},
  }));

// Dérive les paramètres de ranking depuis l'input (defaults par version). Partagé entre l'exécution
// et le debug (explainRanking) pour garantir un SQL identique.
const resolveRankingParams = (input: RankMissionsByUserScoringInput) => {
  const version = input.version ?? CURRENT_MATCHING_ENGINE_VERSION;
  const versionConfig = MATCHING_ENGINE_VERSIONS[version];
  const limit = Math.max(1, Math.min(500, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  // The persisted snapshot is defined as the first page of the ranking.
  const shouldPersistTopResults = offset === 0;
  const rankingLimit = shouldPersistTopResults ? Math.max(limit, MATCHING_ENGINE_TOP_RESULTS_LIMIT) : limit;

  return {
    version,
    limit,
    offset,
    shouldPersistTopResults,
    rankingLimit,
    taxonomyWeights: versionConfig.taxonomyWeights,
    rankingTaxonomyKeys: Object.keys(versionConfig.taxonomyWeights) as MatchingEngineTaxonomy[],
    taxonomyWeight: input.taxonomyWeight ?? 0.3,
    geoWeight: input.geoWeight ?? versionConfig.geoWeight,
    geoHalfDecayKm: input.geoHalfDecayKm ?? 20,
    missingGeoScore: input.missingGeoScore ?? 0.1,
    remoteFullGeoScore: input.remoteFullGeoScore !== undefined ? input.remoteFullGeoScore : versionConfig.remoteFullGeoScore,
    remoteLocalGeoScore: input.remoteLocalGeoScore !== undefined ? input.remoteLocalGeoScore : versionConfig.remoteLocalGeoScore,
    geoRadiusScoreMode: versionConfig.geoRadiusScoreMode,
    taxonomyCandidateLimit: getTaxonomyCandidateLimit({ limit: rankingLimit, offset }),
    geoCandidateLimit: getGeoCandidateLimit({ limit: rankingLimit, offset }),
  };
};

const buildRankingSqlForInput = async (input: RankMissionsByUserScoringInput): Promise<Prisma.Sql> => {
  const params = resolveRankingParams(input);

  return buildRanking({
    userScoringId: input.userScoringId,
    publisherDiffusionJoinSql: buildPublisherDiffusionJoinSql(input.publisherId),
    taxonomyWeights: params.taxonomyWeights,
    taxonomyWeight: params.taxonomyWeight,
    geoWeight: params.geoWeight,
    geoHalfDecayKm: params.geoHalfDecayKm,
    missingGeoScore: params.missingGeoScore,
    remoteFullGeoScore: params.remoteFullGeoScore,
    remoteLocalGeoScore: params.remoteLocalGeoScore,
    geoRadiusScoreMode: params.geoRadiusScoreMode,
    taxonomyCandidateLimit: params.taxonomyCandidateLimit,
    geoCandidateLimit: params.geoCandidateLimit,
    limit: params.rankingLimit,
    offset: params.offset,
  });
};

export const matchingEngineService = {
  async rankMissionsByUserScoring(input: RankMissionsByUserScoringInput): Promise<RankMissionsByUserScoringResult> {
    const startedAt = Date.now();
    const { version, limit, offset, shouldPersistTopResults, rankingTaxonomyKeys } = resolveRankingParams(input);

    await assertUserScoringExists(input.userScoringId);

    const rows = await prisma.$queryRaw<DbRankRow[]>(await buildRankingSqlForInput(input));
    const missionScoringIdsForDetails = rows.slice(0, MATCHING_ENGINE_TOP_RESULTS_LIMIT).map((row) => row.mission_scoring_id);
    const taxonomyScoresRows =
      missionScoringIdsForDetails.length > 0
        ? await prisma.$queryRaw<DbTaxonomyScoreRow[]>(
            buildTaxonomyScoresSql({
              userScoringId: input.userScoringId,
              missionScoringIds: missionScoringIdsForDetails,
              taxonomyKeys: rankingTaxonomyKeys,
            })
          )
        : [];
    const taxonomyScoresByMissionScoringId = buildTaxonomyScoresIndex(taxonomyScoresRows);
    const responseRows = shouldPersistTopResults ? rows.slice(0, limit) : rows;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    // Distance moyenne des 5 premières missions recommandées : pertinente uniquement sur la 1re page.
    let avgDistanceKmTop5: number | null = null;
    if (offset === 0) {
      const top5Distances = rows
        .slice(0, 5)
        .map((row) => nullableNumber(row.distance_km))
        .filter((distance): distance is number => distance !== null);
      avgDistanceKmTop5 = top5Distances.length > 0 ? Number((top5Distances.reduce((sum, value) => sum + value, 0) / top5Distances.length).toFixed(2)) : null;
    }

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
      version,
      items: responseRows.map(
        (row): MatchMissionItem => ({
          missionId: row.mission_id,
          missionScoringId: row.mission_scoring_id,
          missionAddressId: row.closest_address_id ?? null,
          totalScore: clampScore(Number(row.total_score)),
          taxonomyScore: clampScore(Number(row.taxonomy_score)),
          geoScore: row.geo_score === null ? null : clampScore(Number(row.geo_score)),
          distanceKm: nullableNumber(row.distance_km),
          closestLat: nullableNumber(row.closest_lat),
          closestLon: nullableNumber(row.closest_lon),
          closestCity: row.closest_city ?? null,
          closestAddress: row.closest_address ?? null,
          taxonomyScores: taxonomyScoresByMissionScoringId[row.mission_scoring_id] ?? {},
        })
      ),
      tookMs: Date.now() - startedAt,
      total,
      avgDistanceKmTop5,
    };
  },

  // Debug/diagnostic : renvoie le plan `EXPLAIN (ANALYZE, BUFFERS)` du SQL de ranking pour un input
  // donné (mêmes paramètres que rankMissionsByUserScoring). Utilisé par scripts/explain-matching-ranking.ts.
  async explainRanking(input: RankMissionsByUserScoringInput): Promise<string> {
    await assertUserScoringExists(input.userScoringId);
    const sql = await buildRankingSqlForInput(input);
    const rows = await prisma.$queryRaw<Array<Record<string, string>>>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);

    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  },
};

export default matchingEngineService;
