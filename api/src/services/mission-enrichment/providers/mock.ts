import type { MissionEnrichmentProvider, MissionEnrichmentProviderResult } from "@/services/mission-enrichment/providers/types";

export const mockMissionEnrichmentProvider: MissionEnrichmentProvider = {
  async generate(): Promise<MissionEnrichmentProviderResult> {
    return {
      object: { classifications: [] },
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  },
};
