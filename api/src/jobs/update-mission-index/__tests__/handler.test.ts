import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-index", () => ({
  missionIndexService: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/error", () => ({ captureException: vi.fn() }));

import { prisma } from "@/db/postgres";
import { UpdateMissionIndexHandler } from "@/jobs/update-mission-index/handler";
import { missionIndexService } from "@/services/mission-index";

const prismaMock = prisma as unknown as {
  mission: { findMany: ReturnType<typeof vi.fn> };
};

const missionIndexServiceMock = missionIndexService as unknown as {
  upsert: ReturnType<typeof vi.fn>;
};

describe("UpdateMissionIndexHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    prismaMock.mission.findMany.mockReset();
    missionIndexServiceMock.upsert.mockResolvedValue(undefined);
  });

  it("indexe directement chaque mission sélectionnée", async () => {
    prismaMock.mission.findMany.mockResolvedValue([{ id: "mission-1" }, { id: "mission-2" }]);

    const result = await new UpdateMissionIndexHandler().handle({ publisherId: "publisher-1", limit: 2 });

    expect(prismaMock.mission.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, statusCode: "ACCEPTED", publisherId: "publisher-1" },
      select: { id: true },
      take: 2,
      orderBy: { updatedAt: "desc" },
    });
    expect(missionIndexServiceMock.upsert).toHaveBeenCalledTimes(2);
    expect(missionIndexServiceMock.upsert).toHaveBeenNthCalledWith(1, "mission-1");
    expect(missionIndexServiceMock.upsert).toHaveBeenNthCalledWith(2, "mission-2");
    expect(result).toMatchObject({ success: true, total: 2, indexed: 2, failed: 0 });
  });

  it("n'indexe pas en dry-run", async () => {
    prismaMock.mission.findMany.mockResolvedValue([{ id: "mission-1" }]);

    const result = await new UpdateMissionIndexHandler().handle({ dryRun: true });

    expect(missionIndexServiceMock.upsert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, total: 1, indexed: 1, failed: 0 });
  });

  it("comptabilise un échec d'indexation sans interrompre les autres missions", async () => {
    prismaMock.mission.findMany.mockResolvedValue([{ id: "mission-1" }, { id: "mission-2" }]);
    missionIndexServiceMock.upsert.mockRejectedValueOnce(new Error("index unavailable"));

    const result = await new UpdateMissionIndexHandler().handle({ batchSize: 1 });

    expect(missionIndexServiceMock.upsert).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ success: false, total: 2, indexed: 1, failed: 1 });
  });
});
