import { MISSION_SCORING_RULESET_V1 } from "@/services/mission-scoring/config";
import type { ComputedMissionScoringValue, ComputeMissionScoringResult, MissionScoringRuleset, ScoringInputValue } from "@/services/mission-scoring/types";

const roundScore = (value: number): number => Number(Math.max(0, Math.min(1, value)).toFixed(6));

const buildIgnoredValueKeySet = (ruleset: MissionScoringRuleset): Set<string> => new Set(ruleset.ignoredValueKeys);

export const computeMissionScoringValues = (input: ScoringInputValue[], ruleset: MissionScoringRuleset = MISSION_SCORING_RULESET_V1): ComputeMissionScoringResult => {
  const ignoredValueKeys = buildIgnoredValueKeySet(ruleset);
  const valuesByTaxonomyValueId = new Map<string, ComputedMissionScoringValue>();
  const ignored: ComputeMissionScoringResult["ignored"] = [];

  for (const value of input) {
    const strategy = ruleset.strategiesByType[value.taxonomyType];

    if (strategy !== "exact_only") {
      ignored.push({ ...value, reason: `unsupported_strategy:${strategy}` });
      continue;
    }

    const ignoredValueKey = `${value.taxonomyKey}.${value.taxonomyValueKey}`;
    if (ignoredValueKeys.has(ignoredValueKey)) {
      ignored.push({ ...value, reason: `ignored_value:${ignoredValueKey}` });
      continue;
    }

    const computedValue: ComputedMissionScoringValue = {
      missionEnrichmentValueId: value.missionEnrichmentValueId,
      taxonomyValueId: value.taxonomyValueId,
      score: roundScore(value.confidence),
    };

    const current = valuesByTaxonomyValueId.get(computedValue.taxonomyValueId);
    if (!current || computedValue.score > current.score) {
      valuesByTaxonomyValueId.set(computedValue.taxonomyValueId, computedValue);
    }
  }

  return {
    values: Array.from(valuesByTaxonomyValueId.values()),
    ignored,
  };
};
