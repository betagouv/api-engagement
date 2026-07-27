import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-diffusion", () => ({
  missionDiffusionService: {
    rebuildForMission: vi.fn(),
  },
}));

vi.mock("@/services/async-task", () => ({
  asyncTaskBus: {
    publish: vi.fn(),
  },
}));

import { asyncTaskBus } from "@/services/async-task";
import { missionDiffusionService } from "@/services/mission-diffusion";
import { handleMissionDiffusion } from "@/worker/handlers/mission-diffusion";
import { missionDiffusionPayloadSchema } from "@/worker/types";

const missionDiffusionServiceMock = missionDiffusionService as unknown as {
  rebuildForMission: ReturnType<typeof vi.fn>;
};
const asyncTaskBusMock = asyncTaskBus as unknown as {
  publish: ReturnType<typeof vi.fn>;
};

describe("mission diffusion worker", () => {
  it("valide le payload mission.diffusion", () => {
    expect(missionDiffusionPayloadSchema.parse({ missionId: "mission-1" })).toEqual({ missionId: "mission-1" });
  });

  it("recalcule la diffusion avant de publier mission.index", async () => {
    missionDiffusionServiceMock.rebuildForMission.mockResolvedValue({
      missionId: "mission-1",
      desired: 2,
      added: 1,
      removed: 1,
      durationMs: 10,
    });
    asyncTaskBusMock.publish.mockResolvedValue(undefined);

    await handleMissionDiffusion({ missionId: "mission-1" });

    expect(missionDiffusionServiceMock.rebuildForMission).toHaveBeenCalledWith("mission-1");
    expect(asyncTaskBusMock.publish).toHaveBeenCalledWith({
      type: "mission.index",
      payload: { missionId: "mission-1", action: "upsert" },
    });
  });

  it("ne publie pas mission.index si le recalcul échoue", async () => {
    missionDiffusionServiceMock.rebuildForMission.mockRejectedValue(new Error("diffusion failed"));

    await expect(handleMissionDiffusion({ missionId: "mission-1" })).rejects.toThrow("diffusion failed");

    expect(asyncTaskBusMock.publish).not.toHaveBeenCalled();
  });
});
