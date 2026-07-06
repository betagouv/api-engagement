export type EvalEnv = "staging" | "production";
export type MatchingAlgo = "m1" | "m2";
export type Segment = "lyceen" | "etudiant" | "demandeur_emploi" | "actif" | "autre";
export type JudgeCause = "matching" | "offre" | "signal";
export type CampaignStatus = "success" | "failed";

export type UserScoringAnswer = { taxonomy: string; value: string; params?: never } | { taxonomy: string; params: Record<string, unknown>; value?: never };

export type Parcours = {
  id: string;
  segment: Segment;
  label: string;
  locationLabel: string;
  age: number;
  handicap?: "oui" | "non" | "ne_se_prononce_pas";
  answers: UserScoringAnswer[];
  notes?: string[];
};

export type MatchValue = {
  taxonomyKey: string;
  taxonomyValueKey: string;
  taxonomyValueLabel?: string;
  enrichmentConfidence?: number;
  scoringScore?: number;
  evidence?: unknown;
};

export type MatchItem = {
  mission: {
    id: string;
    title: string;
    remote: "no" | "possible" | "full" | null;
    schedule: string | null;
    domain?: string | null;
    organizationName: string | null;
    publisherName?: string | null;
    location: {
      city: string | null;
      distanceKm: number | null;
      addressId?: string | null;
    };
    compensation: MissionCompensation | null;
  };
  match: {
    totalScore: number;
    taxonomyScore: number;
    geoScore: number | null;
    taxonomyScores: Record<string, number>;
    values: MatchValue[];
  };
};

export type MatchResponse = {
  tookMs?: number;
  items: MatchItem[];
  total: number;
  avgDistanceKmTop5: number | null;
  engineVersion?: MatchingAlgo;
};

export type MissionCompensation = {
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  type: string | null;
};

export type MissionDetail = {
  id: string;
  title: string;
  description: string | null;
  descriptionHtml?: string | null;
  type: string | null;
  schedule: string | null;
  compensation: MissionCompensation | null;
  remote: "no" | "possible" | "full" | null;
  location: { city: string | null; address?: string | null; lat?: number | null; lon?: number | null } | null;
};

export type MissionWithDetail = MatchItem & {
  detail: MissionDetail | null;
  descriptionMissing: boolean;
};

export type GateViolation = {
  missionId: string;
  title: string;
  missionAgeTags: string[];
  userAgeTags: string[];
};

export type DeterministicScores = {
  geo: number | null;
  format: number;
  missionsSansTagFormat: string[];
  gateViolations: GateViolation[];
};

export type JudgeOutput = {
  coherence: {
    score: 1 | 2 | 3 | 4 | 5;
    missionsPertinentes: number[];
    missionIdsPertinents?: string[];
    justification: string;
  };
  homogeneite: {
    score: 1 | 2 | 3 | 4 | 5;
    familles: string[];
    justification: string;
  };
  cause: JudgeCause | null;
};

export type JudgeRunArtifact = {
  runIndex: number;
  seed: number;
  order: string[];
  output: JudgeOutput;
};

export type ParcoursArtifact = {
  status: CampaignStatus;
  parcours: Parcours;
  payload: { answers: UserScoringAnswer[]; distinctId: string; missionAlertEnabled: false };
  userScoringId?: string;
  match?: MatchResponse;
  missions?: MissionWithDetail[];
  deterministic?: DeterministicScores;
  judgeRuns?: JudgeRunArtifact[];
  engineVersion?: MatchingAlgo;
  verdict?: number;
  error?: string;
  startedAt: string;
  finishedAt: string;
};

export type CampaignMetrics = {
  totalParcours: number;
  successfulParcours: number;
  failedParcours: number;
  criteria: Record<string, { mean: number | null; min: number | null; stddev: number | null }>;
  bySegment: Record<string, { count: number; verdictMean: number | null }>;
  belowFourRate: number | null;
  causes: Record<string, number>;
  orderSensitivity: {
    coherenceAbsDiffMean: number | null;
    homogeneiteAbsDiffMean: number | null;
    missionsPertinentesJaccardMean: number | null;
  };
  gates: {
    parcoursWithViolationRate: number | null;
    missionViolations: number;
    totalMissions: number;
  };
};

export type CliOptions = {
  campaign: string;
  env: EvalEnv;
  algo?: MatchingAlgo;
  dryRun: boolean;
  force: boolean;
  parcours?: string;
};
