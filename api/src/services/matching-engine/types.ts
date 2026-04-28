import type { EnrichableTaxonomyKey } from "@engagement/taxonomy";

export type MatchingEngineTaxonomy = EnrichableTaxonomyKey;

export type MatchingEngineTaxonomyWeights = Record<MatchingEngineTaxonomy, number>;

export type MatchingEngineVersion = "m1";

export type MatchingEngineVersionConfig = {
  taxonomyWeights: MatchingEngineTaxonomyWeights;
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
  taxonomyScores: Partial<Record<MatchingEngineTaxonomy, number>>;
};

export type MissionMatchingResultItem = {
  missionScoringId: string;
  taxonomyScores: Partial<Record<MatchingEngineTaxonomy, number>>;
};

export type RankMissionsByUserScoringResult = {
  items: MatchMissionItem[];
  tookMs: number;
};
