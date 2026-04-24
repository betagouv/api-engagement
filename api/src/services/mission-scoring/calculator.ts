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
  const valuesByTaxonomyValueId = new Map<string, ComputedMissionScoringValue>();
  const ignored: ComputeMissionScoringResult["ignored"] = [];

  for (const value of input) {
    const ignoredValueKey = `${value.taxonomyKey}.${value.taxonomyValueKey}`;
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
      taxonomyValueId: value.taxonomyValueId,
      score: mappedScore,
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
