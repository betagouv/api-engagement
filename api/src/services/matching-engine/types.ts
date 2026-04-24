import type { EnrichableDimensionKey } from "@engagement/taxonomy";

export type MatchingEngineDimension = EnrichableDimensionKey;

export type MatchingEngineDimensionWeights = Record<MatchingEngineDimension, number>;

export type MatchingEngineVersion = "m1";

export type MatchingEngineVersionConfig = {
  dimensionWeights: MatchingEngineDimensionWeights;
};

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
