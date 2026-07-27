import type { EnrichableTaxonomyKey, GateTaxonomyKey } from "@engagement/taxonomy";
import type { PromptVersion } from "@/services/mission-enrichment/prompts";

export type MatchingEngineTaxonomy = EnrichableTaxonomyKey | GateTaxonomyKey;

export type MatchingEngineTaxonomyWeights = Partial<Record<MatchingEngineTaxonomy, number>>;

export type MatchingEngineVersion = "m1" | "m2" | "m3";

export type MatchingEngineVersionConfig = {
  promptVersion: PromptVersion;
  taxonomyKeys: readonly MatchingEngineTaxonomy[];
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
  // Score géo forcé pour les missions remote=full (proximité naturelle). null = pas de traitement spécial.
  remoteFullGeoScore: number | null;
  // Score géo forcé pour les missions remote=local (sur site, à proximité). null = pas de traitement spécial.
  remoteLocalGeoScore: number | null;
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
  remoteFullGeoScore?: number | null;
  remoteLocalGeoScore?: number | null;
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
  version: MatchingEngineVersion;
  items: MatchMissionItem[];
  tookMs: number;
  // Nombre total de missions classées pour l'utilisateur (avant pagination).
  total: number;
  // Distance moyenne (km) entre l'utilisateur et les 5 premières missions recommandées.
  // Calculée uniquement sur la première page (offset 0) ; null sinon ou sans localisation.
  avgDistanceKmTop5: number | null;
};
