export type MissionMatchMedia = {
  photo: string | null;
  domainLogo: string | null;
  organizationLogo: string | null;
  publisherLogo: string | null;
};

export type MissionMatchLocation = {
  city: string | null;
  closestLat: number | null;
  closestLon: number | null;
  closestAddress: string | null;
  addressId: string | null;
};

export type MissionMatchMission = {
  id: string;
  title: string;
  remote: "no" | "possible" | "full" | null;
  schedule: string | null;
  domain: string | null;
  domainOriginal: string | null;
  organizationName: string | null;
  publisherName: string | null;
  media: MissionMatchMedia;
  location: MissionMatchLocation;
};

export type MissionMatchValue = {
  taxonomyKey: string;
  taxonomyValueKey: string;
  taxonomyValueLabel: string;
  enrichmentConfidence: number;
  scoringScore: number;
  evidence: unknown;
};

export type MissionMatchScore = {
  missionScoringId: string;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  taxonomyScores: Record<string, number>;
  values: MissionMatchValue[];
};

export type MissionMatchItem = {
  mission: MissionMatchMission;
  match: MissionMatchScore;
};

export type MissionMatchResponse = {
  tookMs: number;
  items: MissionMatchItem[];
};
