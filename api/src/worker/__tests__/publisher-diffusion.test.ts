import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-diffusion", () => ({
  missionDiffusionService: {
    enqueueChangedMissionsForDistributionPublisher: vi.fn(),
  },
}));

import { missionDiffusionService } from "@/services/mission-diffusion";
import { handlePublisherDiffusion } from "@/worker/handlers/publisher-diffusion";
import { publisherDiffusionPayloadSchema } from "@/worker/types";

const missionDiffusionServiceMock = missionDiffusionService as unknown as {
  enqueueChangedMissionsForDistributionPublisher: ReturnType<typeof vi.fn>;
};

describe("publisher diffusion worker", () => {
  it("valide le payload publisher.diffusion", () => {
    expect(publisherDiffusionPayloadSchema.parse({ publisherId: "publisher-1" })).toEqual({ publisherId: "publisher-1" });
  });

  it("déclenche le fan-out des missions modifiées", async () => {
    missionDiffusionServiceMock.enqueueChangedMissionsForDistributionPublisher.mockResolvedValue({
      distributionPublisherId: "publisher-1",
      desired: 3,
      queued: 2,
      added: 1,
      removed: 1,
      durationMs: 10,
    });

    await handlePublisherDiffusion({ publisherId: "publisher-1" });

    expect(missionDiffusionServiceMock.enqueueChangedMissionsForDistributionPublisher).toHaveBeenCalledWith("publisher-1");
  });
});
