export type MatchResultItem = {
  missionId: string;
  missionScoringId: string;
  title: string;
  publisherName: string | null;
  organizationName: string | null;
  schedule: string | null;
  remote: "no" | "possible" | "full" | null;
  domain: string | null;
  photo: string | null;
  city: string | null;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  closestLat: number | null;
  closestLon: number | null;
  closestAddress: string | null;
  taxonomyScores: Record<string, number>;
};

export type MatchResponse = {
  tookMs: number;
  selectedTaxonomies: string[];
  items: MatchResultItem[];
};
