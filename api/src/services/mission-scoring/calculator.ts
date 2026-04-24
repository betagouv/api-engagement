import { MISSION_SCORING_RULESET_V1 } from "@/services/mission-scoring/config";
import type { ComputedMissionScoringValue, ComputeMissionScoringResult, MissionScoringRuleset, ScoringInputValue } from "@/services/mission-scoring/types";

const clampConfidence = (value: number): number => Number(Math.max(0, Math.min(1, value)).toFixed(6));

const buildIgnoredValueKeySet = (ruleset: MissionScoringRuleset): Set<string> => new Set(ruleset.ignoredValueKeys);

const mapConfidenceToScore = (confidence: number, ruleset: MissionScoringRuleset): number | null => {
  const normalizedConfidence = clampConfidence(confidence);

  if (normalizedConfidence < ruleset.minimumConfidence) {
    return null;
  }

  const bucket = ruleset.confidenceScoreBuckets.find(({ minConfidence, maxConfidence }) => normalizedConfidence >= minConfidence && normalizedConfidence < maxConfidence);

  return bucket?.score ?? null;
};

export const computeMissionScoringValues = (input: ScoringInputValue[], ruleset: MissionScoringRuleset = MISSION_SCORING_RULESET_V1): ComputeMissionScoringResult => {
  const ignoredValueKeys = buildIgnoredValueKeySet(ruleset);
  const valuesByPrefixedKey = new Map<string, ComputedMissionScoringValue>();
  const ignored: ComputeMissionScoringResult["ignored"] = [];

  for (const value of input) {
    const ignoredValueKey = `${value.dimensionKey}.${value.taxonomyValueKey}`;
    if (ignoredValueKeys.has(ignoredValueKey)) {
      ignored.push({ ...value, reason: `ignored_value:${ignoredValueKey}` });
      continue;
    }

    const mappedScore = mapConfidenceToScore(value.confidence, ruleset);
    if (mappedScore === null) {
      ignored.push({ ...value, reason: `below_threshold:${clampConfidence(value.confidence)} < ${ruleset.minimumConfidence}` });
      continue;
    }

    const computedValue: ComputedMissionScoringValue = {
      missionEnrichmentValueId: value.missionEnrichmentValueId,
      dimensionKey: value.dimensionKey,
      valueKey: value.taxonomyValueKey,
      taxonomyValueId: value.taxonomyValueId,
      score: mappedScore,
    };

    const prefixedKey = `${computedValue.dimensionKey}.${computedValue.valueKey}`;
    const current = valuesByPrefixedKey.get(prefixedKey);
    if (!current || computedValue.score > current.score) {
      valuesByPrefixedKey.set(prefixedKey, computedValue);
    }
  }

  return {
    values: Array.from(valuesByPrefixedKey.values()),
    ignored,
  };
};
