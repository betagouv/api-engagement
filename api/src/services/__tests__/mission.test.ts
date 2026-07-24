import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueMock, diffusionEnqueueMock, captureExceptionMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  diffusionEnqueueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: { enqueue: enqueueMock },
  buildMissionEnrichmentScoringWhere: vi.fn(),
}));

vi.mock("@/services/mission-diffusion", () => ({
  missionDiffusionService: { enqueue: diffusionEnqueueMock },
}));

vi.mock("@/error", () => ({
  captureException: captureExceptionMock,
}));

import { buildWhere, missionService } from "@/services/mission";

describe("buildWhere diffusion publisher filter", () => {
  it("uses the whole diffusion snapshot when publisherIds is undefined", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", skip: 0, limit: 10 });

    expect(where.AND).toEqual([{ missionDiffusions: { some: { distributionPublisherId: "diffuseur-1" } } }]);
  });

  it("builds an impossible condition when publisherIds is explicitly empty", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", publisherIds: [], skip: 0, limit: 10 });

    expect(where.AND).toEqual([{ id: { in: [] } }]);
  });

  it("intersects the diffusion snapshot with explicit publisherIds", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", publisherIds: ["publisher-1"], skip: 0, limit: 10 });

    expect(where.AND).toEqual([
      {
        AND: [{ missionDiffusions: { some: { distributionPublisherId: "diffuseur-1" } } }, { publisherId: { in: ["publisher-1"] } }],
      },
    ]);
  });
});

describe("missionService.enqueueMissionProcessing", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it("delegates enqueueing to the enrichment service", async () => {
    enqueueMock.mockResolvedValue(undefined);

    await missionService.enqueueMissionProcessing("mission-1");

    expect(enqueueMock).toHaveBeenCalledWith("mission-1");
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("does not propagate queue errors because enqueueing is best-effort", async () => {
    const error = new Error("You do not have sufficient access to perform this action.");
    enqueueMock.mockRejectedValue(error);

    await expect(missionService.enqueueMissionProcessing("mission-1")).resolves.toBeUndefined();

    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      extra: { context: "enqueueMissionProcessing", missionId: "mission-1" },
    });
  });
});

describe("missionService.enqueueMissionDiffusion", () => {
  beforeEach(() => {
    diffusionEnqueueMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it("délègue la publication au service de diffusion", async () => {
    diffusionEnqueueMock.mockResolvedValue(undefined);

    await missionService.enqueueMissionDiffusion("mission-1");

    expect(diffusionEnqueueMock).toHaveBeenCalledWith("mission-1");
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("conserve le caractère best-effort de la publication", async () => {
    const error = new Error("queue unavailable");
    diffusionEnqueueMock.mockRejectedValue(error);

    await expect(missionService.enqueueMissionDiffusion("mission-1")).resolves.toBeUndefined();

    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      extra: { context: "enqueueMissionDiffusion", missionId: "mission-1" },
    });
  });
});
