import { PUBLISHER_IDS } from "@/config";

/**
 * Taxonomy value keys injected directly into mission_scoring for specific publishers.
 * These values bypass LLM enrichment — they are set deterministically based on publisher identity.
 * Score is always 1.0 and missionEnrichmentValueId is null.
 */
export const PUBLISHER_SCORING_RULES: Record<string, string[]> = {
  [PUBLISHER_IDS.SERVICE_CIVIQUE]: ["tranche_age.moins_26_ans", "tranche_age.moins_31_ans_handicap"],
};
