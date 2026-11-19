import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission", () => ({
  missionRepository: { findUnique: vi.fn() },
}));

vi.mock("@/repositories/mission-enrichment", () => ({
  missionEnrichmentRepository: {
    findFirst: vi.fn(),
    claimForRun: vi.fn(),
    update: vi.fn(),
    completeWithValues: vi.fn(),
    failForRun: vi.fn(),
  },
}));

vi.mock("@/services/mission-enrichment/providers", () => ({
  getMissionEnrichmentProvider: vi.fn(),
}));

// Prevent loading @ai-sdk/mistral (not installed) and avoid real LLM model instantiation
vi.mock("@/services/mission-enrichment/prompts", () => ({
  PROMPT_REGISTRY: {
    v2: {
      TAXONOMY_KEYS: ["domaine"],
      MODEL: {},
      TEMPERATURE: 0,
      ENRICHMENT_SCHEMA: {},
      buildSystemPrompt: () => "system",
      buildUserMessage: () => "user",
    },
    v3: {
      TAXONOMY_KEYS: ["domaine"],
      MODEL: {},
      TEMPERATURE: 0,
      ENRICHMENT_SCHEMA: {},
      buildSystemPrompt: () => "system",
      buildUserMessage: () => "user",
    },
    v5: {
      TAXONOMY_KEYS: ["domaine"],
      MODEL: {},
      TEMPERATURE: 0,
      ENRICHMENT_SCHEMA: {},
      buildSystemPrompt: () => "system v5",
      buildUserMessage: () => "user v5",
    },
  },
  buildMissionBlock: () => "mission block",
  buildTaxonomyBlock: () => "taxonomy block",
  CURRENT_PROMPT_VERSION: "v3",
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
  romeSkillLabels: [],
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
    vi.mocked(missionEnrichmentRepository.failForRun).mockResolvedValue(undefined);
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
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "completed",
      createdAt: new Date("2025-01-03"), // after baseMission.updatedAt (2025-01-02)
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("stops the chain when an enrichment is already in-flight (pending)", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "pending",
      createdAt: new Date("2025-01-01"),
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("stops the chain when an enrichment is already in-flight (processing)", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "enrichment-1",
      status: "processing",
      createdAt: new Date("2025-01-01"),
    });

    await missionEnrichmentService.enrich("mission-1");

    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
    expect(providerGenerate).not.toHaveBeenCalled();
  });

  it("stops the chain when claimForRun loses the race to a concurrent worker", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (missionEnrichmentRepository.claimForRun as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await missionEnrichmentService.enrich("mission-1");

    expect(providerGenerate).not.toHaveBeenCalled();
    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
  });

  it("calls LLM and forwards to scoring after successful enrichment", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (missionEnrichmentRepository.claimForRun as ReturnType<typeof vi.fn>).mockResolvedValue({ enrichmentId: "enrichment-new", runId: "run-new" });
    (missionEnrichmentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
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
    expect(missionEnrichmentRepository.completeWithValues).toHaveBeenCalledWith(
      "enrichment-new",
      expect.any(String),
      { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      [],
      "run-new"
    );
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({
      type: "mission.scoring",
      payload: { missionId: "mission-1", missionEnrichmentId: "enrichment-new", force: true },
    });
  });

  it("uses an explicit prompt version independently from the active version", async () => {
    (missionRepository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseMission);
    (missionEnrichmentRepository.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (missionEnrichmentRepository.claimForRun as ReturnType<typeof vi.fn>).mockResolvedValue({ enrichmentId: "enrichment-v5", runId: "run-v5" });
    (missionEnrichmentRepository.completeWithValues as ReturnType<typeof vi.fn>).mockResolvedValue({});
    providerGenerate.mockResolvedValue({
      object: { classifications: [] },
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    await missionEnrichmentService.enrich("mission-1", { promptVersion: "v5" });

    expect(missionEnrichmentRepository.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ promptVersion: "v5" }) }));
    expect(missionEnrichmentRepository.claimForRun).toHaveBeenCalledWith({ missionId: "mission-1", promptVersion: "v5" });
    expect(providerGenerate).toHaveBeenCalledWith(expect.objectContaining({ systemPrompt: "system v5", userMessage: "user v5" }));
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({
      type: "mission.scoring",
      payload: { missionId: "mission-1", missionEnrichmentId: "enrichment-v5", force: true },
    });
  });

  it("preserves usage when generation fails and does not queue scoring", async () => {
    vi.mocked(missionRepository.findUnique).mockResolvedValue(baseMission as never);
    vi.mocked(missionEnrichmentRepository.findFirst).mockResolvedValue(null);
    vi.mocked(missionEnrichmentRepository.claimForRun).mockResolvedValue({ enrichmentId: "enrichment-1", runId: "run-1" });
    const error = Object.assign(new Error("invalid object"), { usage: { inputTokens: 12, outputTokens: 3, totalTokens: 15 } });
    providerGenerate.mockRejectedValue(error);

    await expect(missionEnrichmentService.enrich("mission-1")).rejects.toThrow(error);

    expect(missionEnrichmentRepository.failForRun).toHaveBeenCalledWith("enrichment-1", "run-1", error.usage);
    expect(asyncTaskBus.publish).not.toHaveBeenCalled();
  });

  it("does not fail a completed run when scoring publication fails", async () => {
    vi.mocked(missionRepository.findUnique).mockResolvedValue(baseMission as never);
    vi.mocked(missionEnrichmentRepository.findFirst).mockResolvedValue(null);
    vi.mocked(missionEnrichmentRepository.claimForRun).mockResolvedValue({ enrichmentId: "enrichment-1", runId: "run-1" });
    vi.mocked(missionEnrichmentRepository.completeWithValues).mockResolvedValue(undefined);
    providerGenerate.mockResolvedValue({ object: { classifications: [] }, usage: {} });
    vi.mocked(asyncTaskBus.publish).mockRejectedValueOnce(new Error("queue unavailable"));

    await expect(missionEnrichmentService.enrich("mission-1")).rejects.toThrow("queue unavailable");
    expect(missionEnrichmentRepository.failForRun).not.toHaveBeenCalled();
  });
});
