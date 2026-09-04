import type { EnrichableTaxonomyKey, GateTaxonomyKey } from "@engagement/taxonomy";

export type MatchingEngineTaxonomy = EnrichableTaxonomyKey | GateTaxonomyKey;

export type MatchingEngineTaxonomyWeights = Partial<Record<MatchingEngineTaxonomy, number>>;

export type MatchingEngineVersion = "m1" | "m2" | "m3" | "m4" | "m5";

export type MatchingEngineVersionConfig = {
  taxonomyKeys: readonly MatchingEngineTaxonomy[];
  taxonomyWeights: MatchingEngineTaxonomyWeights;
  geoWeight: number;
  // Score géo forcé pour les missions remote=full (proximité naturelle). null = pas de traitement spécial.
  remoteFullGeoScore: number | null;
  // Score géo forcé pour les missions remote=local (sur site, à proximité). null = pas de traitement spécial.
  remoteLocalGeoScore: number | null;
  // Quand true, le score forcé remote=full n'est appliqué qu'aux utilisateurs ayant coché
  // « je veux participer à distance » (motivation_recherche.remote) ; sinon leur score géo vaut 0.
  gateRemoteFullGeoScoreOnIntent: boolean;
  // Socle acquis d'office par taxonomie dès qu'une valeur est en commun (part matchée sur le reste).
  // Plus il est bas, plus la qualité du match (part des valeurs matchées) pèse dans le taxonomy_score.
  taxonomyOrBaseScore: number;
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
  taxonomyOrBaseScore?: number;
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
