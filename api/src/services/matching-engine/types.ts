import type { DimensionKey } from "@engagement/taxonomy";

// Dimensions actives dans le matching engine — sous-ensemble des dims enrichissables du package.
// Les dimensions retirées (accessibilite, format_activite, engagement_civique, niveau_engagement)
// n'existent pas dans la taxonomie seedée et n'ont aucune donnée en DB.
export const MATCHING_ENGINE_DIMENSIONS = ["domaine", "secteur_activite", "type_mission", "competence_rome", "region_internationale"] as const satisfies readonly DimensionKey[];

export type MatchingEngineDimension = (typeof MATCHING_ENGINE_DIMENSIONS)[number];

export type MatchingEngineDimensionWeights = Record<MatchingEngineDimension, number>;

export type MatchingEngineVersion = "m1";

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "m1";

export const MATCHING_ENGINE_TOP_RESULTS_LIMIT = 20;

export type RankMissionsByUserScoringInput = {
  userScoringId: string;
  version?: MatchingEngineVersion;
  limit?: number;
  offset?: number;
  taxonomyWeight?: number;
  geoWeight?: number;
  geoHalfDecayKm?: number;
  missingGeoScore?: number;
};

export type MatchMissionItem = {
  missionId: string;
  missionScoringId: string;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  dimensionScores: Partial<Record<MatchingEngineDimension, number>>;
};

export type MissionMatchingResultItem = {
  missionScoringId: string;
  dimensionScores: Partial<Record<MatchingEngineDimension, number>>;
};

export type RankMissionsByUserScoringResult = {
  items: MatchMissionItem[];
  tookMs: number;
};
