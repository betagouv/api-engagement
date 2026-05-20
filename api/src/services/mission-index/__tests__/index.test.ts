import { PUBLISHER_IDS } from "@/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertDocumentMock = vi.hoisted(() => vi.fn());
const deleteDocumentMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: {
    upsert: upsertDocumentMock,
    delete: deleteDocumentMock,
  },
}));

vi.mock("@/services/mission-diffusion-eligibility", () => ({
  missionDiffusionEligibilityService: {
    isEligible: vi.fn(),
  },
}));

import { prisma } from "@/db/postgres";
import { missionDiffusionEligibilityService } from "@/services/mission-diffusion-eligibility";
import { missionIndexService } from "@/services/mission-index";

const prismaMock = prisma as unknown as {
  mission: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const buildMission = (overrides: Record<string, unknown> = {}) => ({
  id: "mission-1",
  publisherId: PUBLISHER_IDS.JEVEUXAIDER,
  type: null,
  deletedAt: null,
  statusCode: "ACCEPTED",
  addresses: [{ departmentCode: "75" }],
  missionScorings: [
    {
      missionScoringValues: [{ taxonomyKey: "domaine", valueKey: "social_solidarite" }],
    },
  ],
  ...overrides,
});

describe("missionIndexService.upsert", () => {
  beforeEach(() => {
    prismaMock.mission.findUnique.mockReset();
    upsertDocumentMock.mockReset();
    deleteDocumentMock.mockReset();
    (missionDiffusionEligibilityService.isEligible as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it("supprime les missions non acceptées de l'index", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission({ statusCode: "REFUSED" }));
    deleteDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(deleteDocumentMock).toHaveBeenCalledWith("mission-1");
    expect(upsertDocumentMock).not.toHaveBeenCalled();
  });

  it("supprime les missions non éligibles de l'index", async () => {
    (missionDiffusionEligibilityService.isEligible as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    prismaMock.mission.findUnique.mockResolvedValue(buildMission({ publisherId: "publisher-1", type: "benevolat" }));
    deleteDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(deleteDocumentMock).toHaveBeenCalledWith("mission-1");
    expect(upsertDocumentMock).not.toHaveBeenCalled();
  });

  it("indexe les missions acceptées", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission());
    upsertDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(upsertDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mission-1",
        publisherId: PUBLISHER_IDS.JEVEUXAIDER,
        departmentCodes: ["75"],
        domaine: ["social_solidarite"],
      })
    );
    expect(deleteDocumentMock).not.toHaveBeenCalled();
  });
});
