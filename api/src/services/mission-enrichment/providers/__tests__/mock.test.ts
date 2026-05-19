import { mockMissionEnrichmentProvider } from "@/services/mission-enrichment/providers/mock";
import { describe, expect, it } from "vitest";

describe("mockMissionEnrichmentProvider", () => {
  it("retourne un enrichissement vide sans appel externe", async () => {
    await expect(mockMissionEnrichmentProvider.generate()).resolves.toEqual({
      object: { classifications: [] },
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
  });
});
