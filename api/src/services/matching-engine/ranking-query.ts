import { Prisma } from "@/db/core";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import { GATE_TAXONOMIES } from "@engagement/taxonomy";
import { resolveRankingParams } from "./ranking-params";
import type { MatchingEngineTaxonomyWeights, RankMissionsByUserScoringInput } from "./types";

// Le préfiltrage géographique utilise une boîte englobante volontairement plus large que
// la distance de référence. Le calcul Haversine précis n'est effectué que dans cette boîte.
const GEO_PREFILTER_RADIUS_MULTIPLIER = 6;
const DEFAULT_GEO_RADIUS_KM = 20;

const buildTaxonomyWeightsValuesSql = (taxonomyWeights: Readonly<MatchingEngineTaxonomyWeights>) =>
  Prisma.join(Object.entries(taxonomyWeights).map(([taxonomy, weight]) => Prisma.sql`(${taxonomy}, CAST(${weight} AS double precision))`));

const buildGateTaxonomiesSql = () => Prisma.join(GATE_TAXONOMIES.map((taxonomy) => Prisma.sql`${taxonomy}`));

/**
 * Construit le classement en une requête SQL composée de CTE successifs.
 *
 * Le flux est volontairement linéaire : profil utilisateur → missions éligibles → deux pools de
 * candidats (taxonomie et géographie) → fusion → score final → pagination. Garder ces phases dans
 * une seule requête évite de transférer tout le catalogue vers Node.js.
 */
export const buildRankingQuery = (params: {
  userScoringId: string;
  publisherDiffusionJoinSql?: Prisma.Sql;
  taxonomyWeights: Readonly<MatchingEngineTaxonomyWeights>;
  taxonomyWeight: number;
  geoWeight: number;
  geoHalfDecayKm: number;
  missingGeoScore: number;
  remoteFullGeoScore: number | null;
  remoteLocalGeoScore: number | null;
  gateRemoteFullGeoScoreOnIntent: boolean;
  taxonomyOrBaseScore: number;
  taxonomyCandidateLimit: number;
  geoCandidateLimit: number;
  coverageDispositifs: string[];
  limit: number;
  offset: number;
}) => {
  // Missions remote=full/local : proximité naturelle (score géo forcé), uniquement si la version l'active.
  const forcedRemoteActive = params.remoteFullGeoScore != null || params.remoteLocalGeoScore != null;
  // L'utilisateur a-t-il coché « je veux participer à distance » ? Sous-requête non corrélée (InitPlan).
  const userWantsRemoteSql = Prisma.sql`EXISTS (
      SELECT 1
      FROM "user_scoring_value" usv
      WHERE usv."user_scoring_id" = ${params.userScoringId}
        AND usv."taxonomy_key" = 'motivation_recherche'
        AND usv."value_key" = 'remote'
    )`;
  const remoteFullGeoScoreSql =
    params.remoteFullGeoScore == null
      ? Prisma.empty
      : params.gateRemoteFullGeoScoreOnIntent
        ? // Score forcé seulement si l'utilisateur veut du remote ; sinon 0 (aucun signal de proximité).
          Prisma.sql`WHEN m."remote"::text = 'full' THEN CASE
            WHEN ${userWantsRemoteSql} THEN CAST(${params.remoteFullGeoScore} AS double precision)
            ELSE CAST(0 AS double precision)
          END`
        : Prisma.sql`WHEN m."remote"::text = 'full' THEN CAST(${params.remoteFullGeoScore} AS double precision)`;
  const remoteLocalGeoScoreSql =
    params.remoteLocalGeoScore == null ? Prisma.empty : Prisma.sql`WHEN m."remote"::text = 'local' THEN CAST(${params.remoteLocalGeoScore} AS double precision)`;
  const geoRadiusKmSql = Prisma.sql`COALESCE(NULLIF(ug."radius_km", 0), CAST(${DEFAULT_GEO_RADIUS_KM} AS double precision))`;
  const distanceGeoScoreSql = Prisma.sql`
    CASE
      WHEN gs."distance_km" >= ${geoRadiusKmSql} THEN 0.0
      ELSE GREATEST(0.0, 1.0 - (gs."distance_km" / ${geoRadiusKmSql}))
    END`;

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
  const baseTotalScoreSql = Prisma.sql`CASE
      WHEN r."geo_score" IS NULL THEN r."taxonomy_score"
      ELSE (
        (CAST(${params.taxonomyWeight} AS double precision) * r."taxonomy_score") +
        (CAST(${params.geoWeight} AS double precision) * r."geo_score")
      ) / NULLIF(
        CAST(${params.taxonomyWeight} AS double precision) + CAST(${params.geoWeight} AS double precision),
        0.0
      )
    END`;
  const coverageCandidatesCteSql =
    params.coverageDispositifs.length === 0
      ? Prisma.empty
      : Prisma.sql`,
  -- Ajoute au pool de sortie le meilleur candidat de chaque dispositif demandé. Le réordonnancement
  -- garantissant leur présence dans le top est ensuite réalisé en mémoire sans altérer les scores.
  coverage_best_candidates AS (
    SELECT ranked_coverage.*
    FROM (
      SELECT
        s.*,
        ROW_NUMBER() OVER (
          PARTITION BY msv."value_key"
          ORDER BY s."total_score" DESC, s."mission_id" ASC
        ) AS "coverage_rank"
      FROM scored s
      JOIN "mission_scoring_value" msv
        ON msv."mission_scoring_id" = s."mission_scoring_id"
       AND msv."taxonomy_key" = 'dispositif'
       AND msv."value_key" IN (${Prisma.join(params.coverageDispositifs)})
    ) ranked_coverage
    WHERE ranked_coverage."coverage_rank" = 1
  ),
  selected_results AS (
    SELECT primary_results.*
    FROM primary_results
    UNION
    SELECT
      cbc."mission_id",
      cbc."mission_scoring_id",
      cbc."total_score",
      cbc."taxonomy_score",
      cbc."geo_score",
      cbc."distance_km",
      cbc."closest_lat",
      cbc."closest_lon",
      cbc."closest_address_id",
      cbc."closest_city",
      cbc."closest_address",
      cbc."total_count"
    FROM coverage_best_candidates cbc
  )`;
  const selectedResultsTableSql = params.coverageDispositifs.length === 0 ? Prisma.sql`primary_results` : Prisma.sql`selected_results`;
  return Prisma.sql`
  -- Phase 1 : limiter le profil aux taxonomies pondérées par la version active.
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
  -- Phase 2 : ne garder qu'un scoring actif par mission, puis appliquer les taxonomies « gate ».
  -- Une gate présente sur une mission doit partager au moins une valeur avec le profil utilisateur.
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
  -- Phase 3 : calculer la similarité taxonomique. Une taxonomie partiellement matchée reçoit le
  -- socle taxonomyOrBaseScore, complété par la proportion de valeurs communes, puis par son poids.
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
          CAST(${params.taxonomyOrBaseScore} AS double precision) +
          ((1.0 - CAST(${params.taxonomyOrBaseScore} AS double precision)) * LEAST(mv."taxonomy_sum" / NULLIF(udt."taxonomy_total", 0), 1.0))
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
  -- Phase 4 : construire en parallèle un pool de missions proches. La boîte englobante réduit le
  -- coût du calcul Haversine ; le fallback global ne s'active que si les deux pools sont vides.
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
  -- Phase 5 : fusionner les pools et dédupliquer une mission présente dans plusieurs chemins.
  -- On conserve sa distance minimale et son meilleur signal taxonomique.
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
          CAST(${params.taxonomyOrBaseScore} AS double precision) +
          ((1.0 - CAST(${params.taxonomyOrBaseScore} AS double precision)) * LEAST(gmv."taxonomy_sum" / NULLIF(udt."taxonomy_total", 0), 1.0))
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
  -- Calculer ici seulement l'adresse réellement la plus proche des candidats retenus.
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
  -- Phase 6 : normaliser les deux composantes et produire le score final pondéré.
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
  ),
  scored AS (
    SELECT
      r."mission_id",
      r."mission_scoring_id",
      ${baseTotalScoreSql} AS "total_score",
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
  ),
  primary_results AS (
    SELECT *
    FROM scored
    ORDER BY "total_score" DESC, "mission_id" ASC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  )${coverageCandidatesCteSql}
  SELECT *
  FROM ${selectedResultsTableSql}
  ORDER BY "total_score" DESC, "mission_id" ASC
`;
};

const buildPublisherDiffusionJoin = (publisherId?: string): Prisma.Sql => {
  if (!publisherId) {
    return Prisma.empty;
  }

  return Prisma.sql`JOIN "mission_diffusion" md
    ON md."mission_id" = m."id"
   AND md."distribution_publisher_id" = ${publisherId}
   AND md."deleted_at" IS NULL`;
};

/** Construit la requête complète à partir de l'input public et des préférences de couverture. */
export const buildRankingQueryForInput = (input: RankMissionsByUserScoringInput, coverageDispositifs: string[] = []): Prisma.Sql => {
  const params = resolveRankingParams(input);

  return buildRankingQuery({
    userScoringId: input.userScoringId,
    publisherDiffusionJoinSql: buildPublisherDiffusionJoin(input.publisherId),
    taxonomyWeights: params.taxonomyWeights,
    taxonomyWeight: params.taxonomyWeight,
    geoWeight: params.geoWeight,
    geoHalfDecayKm: params.geoHalfDecayKm,
    missingGeoScore: params.missingGeoScore,
    remoteFullGeoScore: params.remoteFullGeoScore,
    remoteLocalGeoScore: params.remoteLocalGeoScore,
    gateRemoteFullGeoScoreOnIntent: params.gateRemoteFullGeoScoreOnIntent,
    taxonomyOrBaseScore: params.taxonomyOrBaseScore,
    taxonomyCandidateLimit: params.taxonomyCandidateLimit,
    geoCandidateLimit: params.geoCandidateLimit,
    coverageDispositifs,
    limit: params.rankingLimit,
    offset: params.rankingOffset,
  });
};
