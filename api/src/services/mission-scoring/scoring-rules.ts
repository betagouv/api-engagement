import type { MissionType } from "@/db/core";
import type { TaxonomyValueKey } from "@engagement/taxonomy";

import { PUBLISHER_IDS } from "@/config";

type MissionScoringRuleMission = {
  publisherId: string | null;
  type: MissionType | null;
};

type MissionScoringRuleField = keyof MissionScoringRuleMission;

type MissionScoringRules = {
  [Field in MissionScoringRuleField]?: Partial<Record<NonNullable<MissionScoringRuleMission[Field]>, TaxonomyValueKey[]>>;
};

/**
 * Taxonomy value keys injected directly into mission_scoring for specific mission fields.
 * These values bypass LLM enrichment and are set deterministically from mission data.
 * Score is always 1.0 and missionEnrichmentValueId is null.
 */
export const SCORING_RULES = {
  publisherId: {
    [PUBLISHER_IDS.SERVICE_CIVIQUE]: ["tranche_age.moins_26_ans", "tranche_age.moins_31_ans_handicap"],
    [PUBLISHER_IDS.ROC]: ["tranche_age.entre_17_72_ans"],
  },
  type: {
    volontariat_sapeurs_pompiers: ["tranche_age.entre_16_67_ans"],
  },
} satisfies MissionScoringRules;

export const getMissionScoringRuleKeys = (mission: MissionScoringRuleMission): TaxonomyValueKey[] => {
  const keys = new Set<TaxonomyValueKey>();

  for (const [field, rulesByValue] of Object.entries(SCORING_RULES) as [MissionScoringRuleField, Partial<Record<string, TaxonomyValueKey[]>>][]) {
    const value = mission[field];
    if (value == null) {
      continue;
    }

    for (const key of rulesByValue[String(value)] ?? []) {
      keys.add(key);
    }
  }

  return Array.from(keys);
};
