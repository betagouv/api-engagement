import type { TaxonomyKey } from "@/db/core";

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
  dimensionKey: TaxonomyKey;
  valueKey: string;
  taxonomyValueId: string | null;
  taxonomyValueKey: string;
  confidence: number;
};

export type ComputedMissionScoringValue = {
  missionEnrichmentValueId: string | null;
  dimensionKey: string;
  valueKey: string;
  taxonomyValueId: string | null;
  score: number;
};

export type IgnoredScoringInputValue = ScoringInputValue & {
  reason: string;
};

export type ComputeMissionScoringResult = {
  values: ComputedMissionScoringValue[];
  ignored: IgnoredScoringInputValue[];
};
