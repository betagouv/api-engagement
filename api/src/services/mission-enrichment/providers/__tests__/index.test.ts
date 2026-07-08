import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-enrichment/providers/llm", () => ({
  llmMissionEnrichmentProvider: { __kind: "llm" },
}));

vi.mock("@/services/mission-enrichment/providers/mock", () => ({
  mockMissionEnrichmentProvider: { __kind: "mock" },
}));

// La sélection lit MISSION_ENRICHMENT_PROVIDER résolu au chargement de @/config : on remocke le
// module avant chaque import isolé pour tester chaque valeur.
const loadSelector = async (provider: string) => {
  vi.resetModules();
  vi.doMock("@/config", () => ({ MISSION_ENRICHMENT_PROVIDER: provider }));
  const mod = await import("@/services/mission-enrichment/providers");
  return mod.getMissionEnrichmentProvider();
};

describe("getMissionEnrichmentProvider", () => {
  afterEach(() => {
    vi.doUnmock("@/config");
  });

  it("returns the mock provider when MISSION_ENRICHMENT_PROVIDER is 'mock'", async () => {
    const provider = await loadSelector("mock");
    expect(provider).toEqual({ __kind: "mock" });
  });

  it.each(["mistral", "albert", "openai"])("returns the llm provider for '%s'", async (name) => {
    const provider = await loadSelector(name);
    expect(provider).toEqual({ __kind: "llm" });
  });
});
