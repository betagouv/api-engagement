import { beforeEach, describe, expect, it, vi } from "vitest";

const scoreMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/mission-scoring", () => ({
  missionScoringService: {
    score: scoreMock,
  },
}));

vi.mock("@/services/async-task", () => ({
  asyncTaskBus: {
    publish: publishMock,
  },
}));

import { prisma } from "@/db/postgres";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";
import { UpdateMissionScoringHandler } from "../handler";

const prismaMock = prisma as unknown as {
  missionEnrichment: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("UpdateMissionScoringHandler", () => {
  beforeEach(() => {
    prismaMock.missionEnrichment.findMany.mockReset();
    scoreMock.mockReset();
    publishMock.mockReset();
    prismaMock.missionEnrichment.findMany.mockResolvedValue([]);
  });

  it("filtre sur la version courante par défaut", async () => {
    await new UpdateMissionScoringHandler().handle();

    expect(prismaMock.missionEnrichment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          promptVersion: CURRENT_PROMPT_VERSION,
          missionScorings: { none: {} },
        }),
      })
    );
  });

  it("recalcule toutes les versions de prompt quand force est activé sans version explicite", async () => {
    await new UpdateMissionScoringHandler().handle({ force: true });

    expect(prismaMock.missionEnrichment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          promptVersion: expect.any(String),
          missionScorings: expect.anything(),
        }),
      })
    );
  });

  it("respecte la version explicite même quand force est activé", async () => {
    await new UpdateMissionScoringHandler().handle({ force: true, promptVersion: "v2" });

    expect(prismaMock.missionEnrichment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          promptVersion: "v2",
        }),
      })
    );
  });
});
