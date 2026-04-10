export const MATCHING_ENGINE_DIMENSIONS = [
  "domaine",
  "secteur_activite",
  "type_mission",
  "accessibilite",
  "format_activite",
  "competence_rome",
  "engagement_civique",
  "niveau_engagement",
  "region_internationale",
] as const;

export type MatchingEngineDimension = (typeof MATCHING_ENGINE_DIMENSIONS)[number];

export type RankMissionsByUserScoringInput = {
  userScoringId: string;
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

export type RankMissionsByUserScoringResult = {
  items: MatchMissionItem[];
  tookMs: number;
};
