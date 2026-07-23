import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission-diffusion", () => ({
  missionDiffusionRepository: {
    deleteRowsForDistributionPublishersNotIn: vi.fn(),
    countRowsForDistributionPublishersNotIn: vi.fn(),
  },
}));

vi.mock("@/services/mission-diffusion", () => ({
  missionDiffusionService: {
    rebuildForDistributionPublisher: vi.fn(),
  },
}));

vi.mock("@/services/publisher-diffusion-rule", () => ({
  default: {
    findDistributionPublisherIdsForSnapshot: vi.fn(),
  },
}));

vi.mock("@/services/async-task", () => ({
  asyncTaskBus: { publish: vi.fn() },
}));

vi.mock("@/error", () => ({
  captureException: vi.fn(),
}));

import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { asyncTaskBus } from "@/services/async-task";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const repositoryMock = missionDiffusionRepository as unknown as {
  deleteRowsForDistributionPublishersNotIn: ReturnType<typeof vi.fn>;
  countRowsForDistributionPublishersNotIn: ReturnType<typeof vi.fn>;
};
const serviceMock = missionDiffusionService as unknown as {
  rebuildForDistributionPublisher: ReturnType<typeof vi.fn>;
};
const ruleServiceMock = publisherDiffusionRuleService as unknown as {
  findDistributionPublisherIdsForSnapshot: ReturnType<typeof vi.fn>;
};
const asyncTaskBusMock = asyncTaskBus as unknown as {
  publish: ReturnType<typeof vi.fn>;
};

describe("MissionDiffusionRebuildHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    asyncTaskBusMock.publish.mockResolvedValue(undefined);
  });

  it("rebuild chaque diffuseur actif puis purge et agrège les compteurs", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1", "d2"]);
    serviceMock.rebuildForDistributionPublisher
      .mockResolvedValueOnce({ distributionPublisherId: "d1", desired: 10, added: 1, removed: 3, durationMs: 1 })
      .mockResolvedValueOnce({ distributionPublisherId: "d2", desired: 20, added: 2, removed: 4, durationMs: 1 });
    repositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(5);

    const result = await new MissionDiffusionRebuildHandler().handle({});

    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenNthCalledWith(1, "d1", { dryRun: false, onMissionsTouched: expect.any(Function) });
    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenNthCalledWith(2, "d2", { dryRun: false, onMissionsTouched: expect.any(Function) });
    expect(repositoryMock.deleteRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1", "d2"]);
    expect(result).toMatchObject({ distributionPublishers: 2, added: 3, removed: 12, prunedDistributionPublishers: 5, reindexRequested: 0, reindexFailed: 0 });
  });

  it("compte la purge sans supprimer en dry-run", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1"]);
    serviceMock.rebuildForDistributionPublisher.mockResolvedValue({ distributionPublisherId: "d1", desired: 10, added: 2, removed: 1, durationMs: 1 });
    repositoryMock.countRowsForDistributionPublishersNotIn.mockResolvedValue(4);

    const result = await new MissionDiffusionRebuildHandler().handle({ dryRun: true });

    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenCalledWith("d1", { dryRun: true, onMissionsTouched: expect.any(Function) });
    expect(repositoryMock.countRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1"]);
    expect(repositoryMock.deleteRowsForDistributionPublishersNotIn).not.toHaveBeenCalled();
    expect(result).toMatchObject({ distributionPublishers: 1, added: 2, removed: 5, prunedDistributionPublishers: 4, dryRun: true });
  });

  it("republie sur le bus les missions touchées et compte les réindexations", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1"]);
    serviceMock.rebuildForDistributionPublisher.mockImplementation(async (_id: string, options: { onMissionsTouched?: (ids: string[]) => Promise<void> }) => {
      await options.onMissionsTouched?.(["m1", "m2"]);
      return { distributionPublisherId: "d1", desired: 2, added: 1, removed: 1, durationMs: 1 };
    });
    repositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(0);

    const result = await new MissionDiffusionRebuildHandler().handle({});

    expect(asyncTaskBusMock.publish).toHaveBeenCalledWith({ type: "mission.index", payload: { missionId: "m1", action: "upsert" } });
    expect(asyncTaskBusMock.publish).toHaveBeenCalledWith({ type: "mission.index", payload: { missionId: "m2", action: "upsert" } });
    expect(result).toMatchObject({ reindexRequested: 2, reindexFailed: 0 });
  });

  it("compte les échecs de republication sans faire échouer le rebuild global", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1"]);
    asyncTaskBusMock.publish.mockRejectedValue(new Error("SQS down"));
    serviceMock.rebuildForDistributionPublisher.mockImplementation(async (_id: string, options: { onMissionsTouched?: (ids: string[]) => Promise<void> }) => {
      await options.onMissionsTouched?.(["m1"]);
      return { distributionPublisherId: "d1", desired: 1, added: 1, removed: 0, durationMs: 1 };
    });
    repositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(0);

    const result = await new MissionDiffusionRebuildHandler().handle({});

    expect(result).toMatchObject({ reindexRequested: 0, reindexFailed: 1, success: false });
  });
});
