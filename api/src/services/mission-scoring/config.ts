import type { MissionScoringRuleset } from "@/services/mission-scoring/types";

export const MISSION_SCORING_RULESET_V1: MissionScoringRuleset = {
  version: "v1",
  strategiesByType: {
    multi_value: "exact_only",
    categorical: "exact_only",
    ordered: "exact_only",
    gate: "exact_only",
  },
  ignoredValueKeys: ["accessibilite.non_specifie"],
};
