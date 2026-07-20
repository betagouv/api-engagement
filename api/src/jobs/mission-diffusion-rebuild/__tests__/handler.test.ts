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

import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
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

describe("MissionDiffusionRebuildHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("rebuild chaque diffuseur actif puis purge et agrège les compteurs", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1", "d2"]);
    serviceMock.rebuildForDistributionPublisher
      .mockResolvedValueOnce({ distributionPublisherId: "d1", desired: 10, added: 1, removed: 3, durationMs: 1 })
      .mockResolvedValueOnce({ distributionPublisherId: "d2", desired: 20, added: 2, removed: 4, durationMs: 1 });
    repositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(5);

    const result = await new MissionDiffusionRebuildHandler().handle({});

    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenNthCalledWith(1, "d1", { dryRun: false });
    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenNthCalledWith(2, "d2", { dryRun: false });
    expect(repositoryMock.deleteRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1", "d2"]);
    expect(result).toMatchObject({ distributionPublishers: 2, added: 3, removed: 12, prunedDistributionPublishers: 5 });
  });

  it("compte la purge sans supprimer en dry-run", async () => {
    ruleServiceMock.findDistributionPublisherIdsForSnapshot.mockResolvedValue(["d1"]);
    serviceMock.rebuildForDistributionPublisher.mockResolvedValue({ distributionPublisherId: "d1", desired: 10, added: 2, removed: 1, durationMs: 1 });
    repositoryMock.countRowsForDistributionPublishersNotIn.mockResolvedValue(4);

    const result = await new MissionDiffusionRebuildHandler().handle({ dryRun: true });

    expect(serviceMock.rebuildForDistributionPublisher).toHaveBeenCalledWith("d1", { dryRun: true });
    expect(repositoryMock.countRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1"]);
    expect(repositoryMock.deleteRowsForDistributionPublishersNotIn).not.toHaveBeenCalled();
    expect(result).toMatchObject({ distributionPublishers: 1, added: 2, removed: 5, prunedDistributionPublishers: 4, dryRun: true });
  });
});
