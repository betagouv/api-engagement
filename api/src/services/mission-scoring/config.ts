import type { MissionScoringRuleset } from "@/services/mission-scoring/types";

export const MISSION_SCORING_RULESET_V1: MissionScoringRuleset = {
  ignoredValueKeys: ["accessibilite.non_specifie"],
  minimumConfidence: 0.55,
  confidenceScoreBuckets: [
    { minConfidence: 0.95, maxConfidence: 1.000001, score: 1.0 },
    { minConfidence: 0.85, maxConfidence: 0.95, score: 0.85 },
    { minConfidence: 0.7, maxConfidence: 0.85, score: 0.6 },
    { minConfidence: 0.55, maxConfidence: 0.7, score: 0.35 },
  ],
};
