import type { DbRankRow } from "./ranking-types";
import { clampScore, nullableNumber } from "./score-utils";
import type { TaxonomyScoresByMission } from "./taxonomy-scores";
import type { MatchMissionItem, MissionMatchingResultItem } from "./types";

export const selectResponseRows = (params: { rows: DbRankRow[]; limit: number; offset: number; shouldPersistTopResults: boolean; hasDispositifCoverage: boolean }): DbRankRow[] => {
  if (params.hasDispositifCoverage) {
    return params.rows.slice(params.offset, params.offset + params.limit);
  }

  // Sans couverture, PostgreSQL a déjà appliqué l'offset. Sur la première page persistée, la requête
  // a simplement chargé quelques lignes supplémentaires pour construire le snapshot.
  return params.shouldPersistTopResults ? params.rows.slice(0, params.limit) : params.rows;
};

export const collectMissionScoringIdsForDetails = (params: {
  responseRows: DbRankRow[];
  orderedRows: DbRankRow[];
  shouldPersistTopResults: boolean;
  snapshotLimit: number;
}): string[] => [
  ...new Set([...params.responseRows, ...(params.shouldPersistTopResults ? params.orderedRows.slice(0, params.snapshotLimit) : [])].map((row) => row.mission_scoring_id)),
];

export const buildMissionMatchingResultItems = (rows: DbRankRow[], taxonomyScores: TaxonomyScoresByMission): MissionMatchingResultItem[] =>
  rows.map((row) => ({
    missionScoringId: row.mission_scoring_id,
    missionAddressId: row.closest_address_id ?? null,
    taxonomyScores: taxonomyScores[row.mission_scoring_id] ?? {},
  }));

export const mapMatchMissionItems = (rows: DbRankRow[], taxonomyScores: TaxonomyScoresByMission): MatchMissionItem[] =>
  rows.map((row) => ({
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
    taxonomyScores: taxonomyScores[row.mission_scoring_id] ?? {},
  }));

/** La distance moyenne n'a de sens que pour le début du classement, avant toute pagination. */
export const computeAvgDistanceKmTop5 = (rows: DbRankRow[], offset: number): number | null => {
  if (offset !== 0) {
    return null;
  }

  const distances = rows
    .slice(0, 5)
    .map((row) => nullableNumber(row.distance_km))
    .filter((distance): distance is number => distance !== null);

  return distances.length > 0 ? Number((distances.reduce((sum, value) => sum + value, 0) / distances.length).toFixed(2)) : null;
};
