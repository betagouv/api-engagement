import { beforeEach, describe, expect, it, vi } from "vitest";

// Force le provider `mock` sans toucher aux autres exports de config (DB, ENV, etc.).
vi.mock("@/config", async (importActual) => {
  const actual = await importActual<typeof import("@/config")>();
  return { ...actual, MISSION_ENRICHMENT_PROVIDER: "mock" };
});

vi.mock("@/repositories/mission", () => ({
  missionRepository: { findUnique: vi.fn() },
}));

vi.mock("@/repositories/mission-enrichment", () => ({
  missionEnrichmentRepository: {
    findFirst: vi.fn(),
    claimForRun: vi.fn(),
    update: vi.fn(),
    completeWithValues: vi.fn(),
  },
}));

vi.mock("@/services/mission-enrichment/providers", () => ({
  getMissionEnrichmentProvider: vi.fn(),
}));

// Prevent loading @ai-sdk/mistral (not installed) and avoid real LLM model instantiation
vi.mock("@/services/mission-enrichment/prompts", () => ({
  PROMPT_REGISTRY: {
    v3: {
      MODEL: {},
      TEMPERATURE: 0,
      ENRICHMENT_SCHEMA: {},
      buildSystemPrompt: () => "system",
      buildUserMessage: () => "user",
    },
  },
  buildMissionBlock: () => "mission block",
  buildTaxonomyBlock: () => "taxonomy block",
}));

import { missionRepository } from "@/repositories/mission";
import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionEnrichmentService } from "@/services/mission-enrichment";
import { getMissionEnrichmentProvider } from "@/services/mission-enrichment/providers";

const baseMission = {
  id: "mission-1",
  title: "Mission test",
  description: "Description",
  tasks: [],
  audience: [],
  softSkills: [],
  requirements: [],
  tags: [],
  type: null,
  remote: null,
  openToMinors: null,
  reducedMobilityAccessible: null,
  duration: null,
  startAt: null,
  endAt: null,
  schedule: null,
  domain: null,
  activities: [],
  publisherOrganization: null,
  deletedAt: null,
  updatedAt: new Date("2025-01-02"),
};

describe("missionEnrichmentService.enrich — mock provider historisation", () => {
  const providerGenerate = vi.fn();

  beforeEach(() => {
    providerGenerate.mockReset();
    (getMissionEnrichmentProvider as ReturnType<typeof vi.fn>).mockReturnValue({ generate: providerGenerate });
  });

  it("historises aiProvider=mock and model=null (no LLM, so no meaningful model id)", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (missionEnrichmentRepository.claimForRun as ReturnType<typeof vi.fn>).mockResolvedValue("enrichment-new");
    (missionEnrichmentRepository.completeWithValues as ReturnType<typeof vi.fn>).mockResolvedValue({});
    providerGenerate.mockResolvedValue({
      object: { classifications: [] },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(missionEnrichmentRepository.claimForRun).toHaveBeenCalledWith({
      missionId: "mission-1",
      promptVersion: "v3",
      aiProvider: "mock",
      model: null,
    });
    expect(missionEnrichmentRepository.completeWithValues).toHaveBeenCalledWith("enrichment-new", expect.any(String), expect.any(Object), expect.any(Array), {
      aiProvider: "mock",
      model: null,
    });
  });
});
