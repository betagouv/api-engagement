import { Prisma } from "@/db/core";

/**
 * Restreint le travail taxonomique aux missions proches, après les gates.
 * Les CTE user_geo, geo_prefilter_settings et eligible_mission_scorings doivent être définis avant.
 */
export const buildGeographicPrefilterCtes = (): Prisma.Sql => {
  const distanceKmSql = Prisma.sql`6371.0 * 2.0 * ASIN(SQRT(LEAST(1.0, GREATEST(0.0,
        POWER(SIN(RADIANS(ma."location_lat" - gps."lat") / 2.0), 2) +
        COS(RADIANS(gps."lat")) * COS(RADIANS(ma."location_lat")) *
        POWER(SIN(RADIANS(ma."location_lon" - gps."lon") / 2.0), 2)
      ))))`;

  return Prisma.sql`
  -- La boîte sert uniquement à utiliser les index. Le cercle exact décide de l'admission.
  -- Une boîte sphérique et le rebouclage des longitudes évitent d'exclure les missions
  -- proches d'un pôle ou de part et d'autre du méridien +/-180°.
  geographic_prefilter_bounds AS MATERIALIZED (
    SELECT gps."lat", gps."lon", gps."radius_km",
      DEGREES(LEAST(gps."radius_km" / 6371.0, PI())) AS "lat_delta",
      CASE
        WHEN ABS(gps."lat") + DEGREES(gps."radius_km" / 6371.0) >= 90.0 THEN 180.0
        ELSE DEGREES(ASIN(LEAST(1.0, SIN(gps."radius_km" / 6371.0) / COS(RADIANS(gps."lat")))))
      END AS "lon_delta"
    FROM geo_prefilter_settings gps
  ),
  -- Matérialiser la recherche spatiale empêche le planificateur de repartir des
  -- scorings (fortement sous-estimés) et de lire les adresses mission par mission.
  geographic_addresses AS MATERIALIZED (
    SELECT ma."mission_id", ma."location_lat", ma."location_lon"
    FROM geographic_prefilter_bounds gps
    JOIN "mission_address" ma
      ON ma."location_lat" IS NOT NULL
     AND ma."location_lon" IS NOT NULL
     AND ma."location_lat" BETWEEN gps."lat" - gps."lat_delta" AND gps."lat" + gps."lat_delta"
     AND (
       ma."location_lon" BETWEEN gps."lon" - gps."lon_delta" AND gps."lon" + gps."lon_delta"
       OR (gps."lon" - gps."lon_delta" < -180.0 AND ma."location_lon" >= gps."lon" - gps."lon_delta" + 360.0)
       OR (gps."lon" + gps."lon_delta" > 180.0 AND ma."location_lon" <= gps."lon" + gps."lon_delta" - 360.0)
     )
  ),
  nearby_missions AS MATERIALIZED (
    SELECT ma."mission_id", MIN(${distanceKmSql}) AS "distance_km"
    FROM geographic_addresses ma
    CROSS JOIN geographic_prefilter_bounds gps
    WHERE EXISTS (
      SELECT 1 FROM eligible_mission_scorings ems WHERE ems."mission_id" = ma."mission_id"
    )
    GROUP BY ma."mission_id", gps."radius_km"
    HAVING MIN(${distanceKmSql}) <= gps."radius_km"
  ),
  geographically_eligible_mission_scorings AS MATERIALIZED (
    SELECT ems."mission_id", ems."mission_scoring_id", ems."remote"
    FROM eligible_mission_scorings ems
    WHERE NOT EXISTS (SELECT 1 FROM user_geo)
       OR ems."remote" IN ('full', 'local')
       OR EXISTS (SELECT 1 FROM nearby_missions nm WHERE nm."mission_id" = ems."mission_id")
       OR NOT EXISTS (
         SELECT 1 FROM "mission_address" ma
         WHERE ma."mission_id" = ems."mission_id"
           AND ma."location_lat" IS NOT NULL AND ma."location_lon" IS NOT NULL
       )
  )`;
};

/** Réutilise les scores déjà calculés, y compris pour les candidats absents du top taxonomique. */
export const buildGeographicCandidateScoresCte = (): Prisma.Sql => Prisma.sql`
  geographic_candidate_scores AS (
    SELECT signals."mission_id", signals."mission_scoring_id",
      MIN(signals."distance_km") AS "distance_km",
      COALESCE(MAX(signals."weighted_sum"), 0) AS "weighted_sum"
    FROM (
      SELECT gc."mission_id", gc."mission_scoring_id", gc."distance_km",
        CAST(NULL AS double precision) AS "weighted_sum", TRUE AS "is_geographic"
      FROM geographic_candidates gc
      UNION ALL
      SELECT ts."mission_id", ts."mission_scoring_id", CAST(NULL AS double precision), ts."weighted_sum", FALSE
      FROM taxonomy_scores ts
    ) signals
    -- Fusionner les signaux évite une jointure coûteuse lorsque le planificateur
    -- sous-estime les scores. Une mission sans correspondance garde un score de zéro.
    GROUP BY signals."mission_id", signals."mission_scoring_id"
    HAVING BOOL_OR(signals."is_geographic")
  )`;
