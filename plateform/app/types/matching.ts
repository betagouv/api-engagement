export type MatchMission = {
  id: string;
  title: string;
  description: string | null;
  tasks: string[];
  audience: string[];
  softSkills: string[];
  requirements: string[];
  tags: string[];
  type: string | null;
  remote: "no" | "possible" | "full" | null;
  schedule: string | null;
  duration: number | null;
  startAt: string | null;
  endAt: string | null;
  domain: string | null;
  domainOriginal: string | null;
  organizationName: string | null;
  publisherName: string | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
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
  selectedTaxonomies: string[];
  items: MatchResultItem[];
};
