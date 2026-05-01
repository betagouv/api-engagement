import type { TaxonomyKey } from "@engagement/taxonomy";

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
  taxonomyKey: TaxonomyKey;
  valueKey: string;
  confidence: number;
};

export type ComputedMissionScoringValue = {
  missionEnrichmentValueId: string | null;
  taxonomyKey: string;
  valueKey: string;
  score: number;
};

export type IgnoredScoringInputValue = ScoringInputValue & {
  reason: string;
};

export type ComputeMissionScoringResult = {
  values: ComputedMissionScoringValue[];
  ignored: IgnoredScoringInputValue[];
};
