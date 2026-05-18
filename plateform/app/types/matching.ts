export type MatchMission = {
  id: string;
  title: string;
  remote: "no" | "possible" | "full" | null;
  schedule: string | null;
  domain: string | null;
  domainOriginal: string | null;
  organizationName: string | null;
  publisherName: string | null;
  media: {
    photo: string | null;
    domainLogo: string | null;
    organizationLogo: string | null;
    publisherLogo: string | null;
  };
  location: {
    city: string | null;
    closestLat: number | null;
    closestLon: number | null;
    closestAddress: string | null;
  };
};

export type MatchExplanationValue = {
  taxonomyKey: string;
  taxonomyValueKey: string;
  taxonomyValueLabel: string;
  enrichmentConfidence: number;
  scoringScore: number;
  evidence: unknown;
};

export type MatchResultItem = {
  mission: MatchMission;
  match: {
    missionScoringId: string;
    totalScore: number;
    taxonomyScore: number;
    geoScore: number | null;
    taxonomyScores: Record<string, number>;
    values: MatchExplanationValue[];
  };
};

export type MatchResponse = {
  tookMs: number;
  items: MatchResultItem[];
};
