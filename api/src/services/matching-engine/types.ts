import { TaxonomyKey } from "@/types/taxonomy";

export const MATCHING_ENGINE_DIMENSIONS = [
  TaxonomyKey.domaine,
  TaxonomyKey.secteur_activite,
  TaxonomyKey.type_mission,
  TaxonomyKey.accessibilite,
  TaxonomyKey.format_activite,
  TaxonomyKey.competence_rome,
  TaxonomyKey.engagement_civique,
  TaxonomyKey.niveau_engagement,
  TaxonomyKey.region_internationale,
] as const satisfies readonly TaxonomyKey[];

export type MatchingEngineDimension = (typeof MATCHING_ENGINE_DIMENSIONS)[number];

export type MatchingEngineDimensionWeights = Record<MatchingEngineDimension, number>;

export type MatchingEngineVersion = "v1";

export const CURRENT_MATCHING_ENGINE_VERSION: MatchingEngineVersion = "v1";

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
