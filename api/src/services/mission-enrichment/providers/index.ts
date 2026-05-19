import { MISSION_ENRICHMENT_PROVIDER } from "@/config";
import { llmMissionEnrichmentProvider } from "@/services/mission-enrichment/providers/llm";
import { mockMissionEnrichmentProvider } from "@/services/mission-enrichment/providers/mock";
import type { MissionEnrichmentProvider } from "@/services/mission-enrichment/providers/types";

export const getMissionEnrichmentProvider = (): MissionEnrichmentProvider => {
  if (MISSION_ENRICHMENT_PROVIDER === "mock") {
    return mockMissionEnrichmentProvider;
  }

  return llmMissionEnrichmentProvider;
};
