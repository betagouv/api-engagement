import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx } = vi.hoisted(() => ({
  tx: {
    $queryRaw: vi.fn(),
    missionEnrichmentRun: { create: vi.fn(), update: vi.fn() },
    missionEnrichment: { update: vi.fn() },
    missionEnrichmentValue: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock("@/db/postgres", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(tx)) },
}));

import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";

describe("mission enrichment runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: "enrichment-1" }]);
    tx.missionEnrichmentRun.create.mockResolvedValue({ id: "run-1" });
  });

  it("creates a run in the same transaction as the reservation", async () => {
    await expect(missionEnrichmentRepository.claimForRun({ missionId: "mission-1", promptVersion: "v5" })).resolves.toEqual({ enrichmentId: "enrichment-1", runId: "run-1" });
    expect(tx.missionEnrichmentRun.create).toHaveBeenCalledWith({
      data: { missionEnrichmentId: "enrichment-1", promptVersion: "v5", status: "processing" },
    });
  });

  it("does not create a run after losing the reservation", async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(missionEnrichmentRepository.claimForRun({ missionId: "mission-1", promptVersion: "v5" })).resolves.toBeNull();
    expect(tx.missionEnrichmentRun.create).not.toHaveBeenCalled();
  });

  it("creates distinct runs when the same enrichment is reused", async () => {
    tx.missionEnrichmentRun.create.mockResolvedValueOnce({ id: "run-1" }).mockResolvedValueOnce({ id: "run-2" });
    const first = await missionEnrichmentRepository.claimForRun({ missionId: "mission-1", promptVersion: "v5" });
    const second = await missionEnrichmentRepository.claimForRun({ missionId: "mission-1", promptVersion: "v5" });
    expect(first?.enrichmentId).toBe(second?.enrichmentId);
    expect(first?.runId).not.toBe(second?.runId);
  });

  it("finalizes the run and the current enrichment together on success", async () => {
    const usage = { inputTokens: 10, outputTokens: 2, totalTokens: 12 };
    await missionEnrichmentRepository.completeWithValues("enrichment-1", "{}", usage, [], "run-1");
    expect(tx.missionEnrichment.update).toHaveBeenCalledWith({
      where: { id: "enrichment-1" },
      data: { status: "completed", rawResponse: "{}", ...usage, completedAt: expect.any(Date) },
    });
    expect(tx.missionEnrichmentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { status: "completed", completedAt: expect.any(Date), ...usage },
    });
  });

  it("finalizes a failed run without storing the response in history", async () => {
    await missionEnrichmentRepository.failForRun("enrichment-1", "run-1", { rawResponse: "invalid", inputTokens: 10 });
    expect(tx.missionEnrichmentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { status: "failed", inputTokens: 10, outputTokens: undefined, totalTokens: undefined },
    });
  });
});
