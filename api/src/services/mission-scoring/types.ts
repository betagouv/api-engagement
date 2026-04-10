import type { TaxonomyType } from "@/db/core";

export type TaxonomyScoringStrategy = "exact_only";

export type MissionScoringRuleset = {
  version: string;
  strategiesByType: Record<TaxonomyType, TaxonomyScoringStrategy>;
  ignoredValueKeys: string[];
};

export type ScoringInputValue = {
  missionEnrichmentValueId: string;
  taxonomyKey: string;
  taxonomyType: TaxonomyType;
  taxonomyValueId: string;
  taxonomyValueKey: string;
  order: number | null;
  confidence: number;
};

export type ComputedMissionScoringValue = {
  missionEnrichmentValueId: string;
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
