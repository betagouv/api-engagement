import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueMock, captureExceptionMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: { enqueue: enqueueMock },
  buildMissionEnrichmentScoringWhere: vi.fn(),
}));

vi.mock("@/error", () => ({
  captureException: captureExceptionMock,
}));

import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { buildWhere, missionService } from "@/services/mission";

describe("buildWhere diffusion publisher filter", () => {
  it("uses the whole diffusion snapshot when publisherIds is undefined", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", skip: 0, limit: 10 });

    expect(where.AND).toEqual([{ missionDiffusions: { some: { distributionPublisherId: "diffuseur-1", deletedAt: null } } }]);
  });

  it("builds an impossible condition when publisherIds is explicitly empty", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", publisherIds: [], skip: 0, limit: 10 });

    expect(where.AND).toEqual([{ id: { in: [] } }]);
  });

  it("intersects the diffusion snapshot with explicit publisherIds", async () => {
    const where = await buildWhere({ diffuseurPublisherId: "diffuseur-1", publisherIds: ["publisher-1"], skip: 0, limit: 10 });

    expect(where.AND).toEqual([
      {
        AND: [{ missionDiffusions: { some: { distributionPublisherId: "diffuseur-1", deletedAt: null } } }, { publisherId: { in: ["publisher-1"] } }],
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

describe("missionService.findMissionsAfterId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("utilise une borne sur id et renvoie la page sans total", async () => {
    const findPage = vi.spyOn(missionDiffusionRepository, "findMissionIdsPageByDistributionPublisher").mockResolvedValue(["mission-2", "mission-3"]);
    vi.spyOn(missionService, "findMissionsByIds").mockResolvedValue([]);

    const result = await missionService.findMissionsAfterId({ diffuseurPublisherId: "diffuseur-1", publisherIds: ["publisher-1"], limit: 1, skip: 0 }, "mission-1");

    expect(findPage).toHaveBeenCalledWith(
      "diffuseur-1",
      expect.objectContaining({
        afterMissionId: "mission-1",
        take: 2,
        missionWhere: expect.objectContaining({ publisherId: { in: ["publisher-1"] }, statusCode: "ACCEPTED", deletedAt: null }),
      })
    );
    expect(result).toMatchObject({ hasMore: true, nextCursor: "mission-2" });
    expect(result).not.toHaveProperty("total");
  });

  it("signale la fin lorsque la page est vide", async () => {
    vi.spyOn(missionDiffusionRepository, "findMissionIdsPageByDistributionPublisher").mockResolvedValue([]);
    vi.spyOn(missionService, "findMissionsByIds").mockResolvedValue([]);

    const result = await missionService.findMissionsAfterId({ diffuseurPublisherId: "diffuseur-1", limit: 1, skip: 0 });

    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result).not.toHaveProperty("total");
  });

  it("ne retourne rien lorsque la liste de publishers demandée est vide", async () => {
    const findPage = vi.spyOn(missionDiffusionRepository, "findMissionIdsPageByDistributionPublisher").mockResolvedValue([]);
    vi.spyOn(missionService, "findMissionsByIds").mockResolvedValue([]);

    await missionService.findMissionsAfterId({ diffuseurPublisherId: "diffuseur-1", publisherIds: [], limit: 1, skip: 0 });

    expect(findPage.mock.calls[0][1].missionWhere?.id).toEqual({ in: [] });
  });
});
