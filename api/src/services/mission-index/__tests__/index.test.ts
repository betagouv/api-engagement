import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertDocumentMock = vi.hoisted(() => vi.fn());
const deleteDocumentMock = vi.hoisted(() => vi.fn());
const ensureMissionCollectionMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/typesense/schema", () => ({
  ensureMissionCollection: ensureMissionCollectionMock,
}));

vi.mock("@/services/typesense/client", () => ({
  typesenseClient: {
    collections: vi.fn(() => ({
      documents: vi.fn((documentId?: string) => {
        if (documentId) {
          return { delete: deleteDocumentMock };
        }
        return { upsert: upsertDocumentMock };
      }),
    })),
  },
}));

import { prisma } from "@/db/postgres";
import { missionIndexService } from "@/services/mission-index";
import { typesenseClient } from "@/services/typesense/client";
import { ensureMissionCollection } from "@/services/typesense/schema";

const prismaMock = prisma as unknown as {
  mission: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const buildMission = (overrides: Record<string, unknown> = {}) => ({
  id: "mission-1",
  publisherId: "publisher-1",
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
    ensureMissionCollectionMock.mockReset();
    vi.mocked(typesenseClient.collections).mockClear();
  });

  it("supprime les missions non acceptées de l'index", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission({ statusCode: "REFUSED" }));
    deleteDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(ensureMissionCollection).toHaveBeenCalledTimes(1);
    expect(deleteDocumentMock).toHaveBeenCalledTimes(1);
    expect(upsertDocumentMock).not.toHaveBeenCalled();
  });

  it("indexe les missions acceptées", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission());
    upsertDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(upsertDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mission-1",
        publisherId: "publisher-1",
        departmentCodes: ["75"],
        domaine: ["social_solidarite"],
      })
    );
    expect(deleteDocumentMock).not.toHaveBeenCalled();
  });
});
