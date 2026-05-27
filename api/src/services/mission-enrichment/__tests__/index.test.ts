import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission", () => ({
  missionRepository: { findUnique: vi.fn() },
}));

vi.mock("@/repositories/mission-enrichment", () => ({
  missionEnrichmentRepository: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
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
    v2: {
      MODEL: {},
      TEMPERATURE: 0,
      ENRICHMENT_SCHEMA: {},
      buildSystemPrompt: () => "system",
      buildUserMessage: () => "user",
    },
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
import { asyncTaskBus } from "@/services/async-task";
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

describe("missionEnrichmentService.enrich — chain propagation", () => {
  const providerGenerate = vi.fn();

  beforeEach(() => {
    providerGenerate.mockReset();
    (getMissionEnrichmentProvider as ReturnType<typeof vi.fn>).mockReturnValue({ generate: providerGenerate });
  });

  it("stops the chain when mission is not found", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("forwards to scoring without calling LLM when mission is deleted", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ ...baseMission, deletedAt: new Date() });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).toHaveBeenCalledOnce();
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({
      type: "mission.scoring",
      payload: { missionId: "mission-1" },
    });
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("stops the chain when a completed enrichment is already up-to-date", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "completed",
      createdAt: new Date("2025-01-03"), // after baseMission.updatedAt (2025-01-02)
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("stops the chain when an enrichment is already in-flight (processing)", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "processing",
      createdAt: new Date("2025-01-01"),
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("proceeds when a completed enrichment is outdated", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "completed",
      createdAt: new Date("2025-01-01"), // before baseMission.updatedAt (2025-01-02)
    });
    (missionEnrichmentRepository.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "enrichment-1" });
    (missionEnrichmentRepository.completeWithValues as ReturnType<typeof vi.fn>).mockResolvedValue({});
    providerGenerate.mockResolvedValue({
      object: { classifications: [] },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(providerGenerate).toHaveBeenCalledOnce();
  });

  it("calls LLM and forwards to scoring after successful enrichment", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (missionEnrichmentRepository.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "enrichment-new" });
    (missionEnrichmentRepository.completeWithValues as ReturnType<typeof vi.fn>).mockResolvedValue({});
    providerGenerate.mockResolvedValue({
      object: { classifications: [] },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(providerGenerate).toHaveBeenCalledWith({
      systemPrompt: "system",
      userMessage: "user",
      promptVersion: expect.objectContaining({ TEMPERATURE: 0 }),
    });
    expect(asyncTaskBus.publish).toHaveBeenCalledOnce();
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({
      type: "mission.scoring",
      payload: { missionId: "mission-1" },
    });
  });

  it("upserts to processing regardless of prior status when force is true", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    // No idempotence check when force=true — findUnique should not be called
    (missionEnrichmentRepository.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "enrichment-1" });
    (missionEnrichmentRepository.completeWithValues as ReturnType<typeof vi.fn>).mockResolvedValue({});
    providerGenerate.mockResolvedValue({
      object: { classifications: [] },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    await missionEnrichmentService.enrich("mission-1", { force: true });

    expect(missionEnrichmentRepository.findUnique).not.toHaveBeenCalled();
    expect(missionEnrichmentRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ status: "processing", enrichmentCount: { increment: 1 } }) })
    );
    expect(providerGenerate).toHaveBeenCalledOnce();
  });
});
