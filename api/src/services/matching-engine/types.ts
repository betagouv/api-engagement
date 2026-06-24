import type { EnrichableTaxonomyKey, GateTaxonomyKey } from "@engagement/taxonomy";

export type MatchingEngineTaxonomy = EnrichableTaxonomyKey | GateTaxonomyKey;

export type MatchingEngineTaxonomyWeights = Record<MatchingEngineTaxonomy, number>;

export type MatchingEngineVersion = "m1" | "m2";

export type MatchingEngineVersionConfig = {
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
};

export type RankMissionsByUserScoringInput = {
  userScoringId: string;
  publisherId?: string;
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
  missionAddressId: string | null;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  closestLat: number | null;
  closestLon: number | null;
  closestCity: string | null;
  closestAddress: string | null;
  taxonomyScores: Partial<Record<MatchingEngineTaxonomy, number>>;
};

export type MissionMatchingResultItem = {
  missionScoringId: string;
  missionAddressId?: string | null;
  taxonomyScores: Partial<Record<MatchingEngineTaxonomy, number>>;
};

export type RankMissionsByUserScoringResult = {
  items: MatchMissionItem[];
  tookMs: number;
  // Nombre total de missions classées pour l'utilisateur (avant pagination).
  total: number;
  // Distance moyenne (km) entre l'utilisateur et les 5 premières missions recommandées.
  // Calculée uniquement sur la première page (offset 0) ; null sinon ou sans localisation.
  avgDistanceKmTop5: number | null;
};
