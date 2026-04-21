export type MissionScoringConfidenceScoreBucket = {
  minConfidence: number;
  maxConfidence: number;
  score: number;
};

export type MissionScoringRuleset = {
  ignoredValueKeys: string[];
  minimumConfidence: number;
  confidenceScoreBuckets: MissionScoringConfidenceScoreBucket[];
};

export type ScoringInputValue = {
  missionEnrichmentValueId: string;
  taxonomyKey: string;
  taxonomyValueId: string;
  taxonomyValueKey: string;
  confidence: number;
};

export type ComputedMissionScoringValue = {
  missionEnrichmentValueId: string | null;
  taxonomyValueId: string;
  score: number;
};

export type IgnoredScoringInputValue = ScoringInputValue & {
  reason: string;
};

export type ComputeMissionScoringResult = {
  values: ComputedMissionScoringValue[];
  ignored: IgnoredScoringInputValue[];
};
