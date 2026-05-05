export type MatchResultItem = {
  missionId: string;
  missionScoringId: string;
  title: string;
  publisherName: string | null;
  city: string | null;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  taxonomyScores: Record<string, number>;
};

export type MatchResponse = {
  tookMs: number;
  selectedTaxonomies: string[];
  items: MatchResultItem[];
};
