import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertDocumentMock = vi.hoisted(() => vi.fn());
const deleteDocumentMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: {
    upsert: upsertDocumentMock,
    delete: deleteDocumentMock,
  },
}));

import { prisma } from "@/db/postgres";
import { missionIndexService } from "@/services/mission-index";

const prismaMock = prisma as unknown as {
  mission: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const buildMission = (overrides: Record<string, unknown> = {}) => ({
  id: "mission-1",
  publisherId: "publisher-1",
  publisherOrganizationId: "publisher-organization-1",
  publisherOrganization: { clientId: "client-org-1", name: "Organisation 1", parentOrganizations: ["Réseau 1", "Réseau 2"] },
  title: "Mission 1",
  domain: { name: "Environnement" },
  deletedAt: null,
  statusCode: "ACCEPTED",
  remote: "possible",
  schedule: "Flexible",
  duration: 3,
  startAt: new Date("2026-02-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  openToMinors: true,
  reducedMobilityAccessible: false,
  closeToTransport: true,
  tasks: ["Accompagnement"],
  audience: ["Jeunes"],
  tags: ["mentor"],
  addresses: [
    {
      city: "Paris",
      departmentCode: "75",
      departmentName: "Paris",
      postalCode: "75001",
      region: "Île-de-France",
      country: "FR",
      locationLat: 48.86,
      locationLon: 2.35,
    },
  ],
  activities: [{ activity: { name: "Mentorat" } }],
  missionDiffusions: [{ distributionPublisherId: "diffuser-1" }, { distributionPublisherId: "diffuser-2" }],
  moderationStatuses: [{ publisherId: "moderateur-1" }],
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
  });

  it("supprime les missions non acceptées de l'index", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission({ statusCode: "REFUSED" }));
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
        publisherId: "publisher-1",
        publisherOrganizationId: "publisher-organization-1",
        publisherOrganizationClientId: "client-org-1",
        moderationAcceptedPublisherIds: ["moderateur-1"],
        publisherOrganizationParentOrganizations: ["Réseau 1", "Réseau 2"],
        mission_domain: "Environnement",
        departmentCodes: ["75"],
        distributionPublisherIds: ["diffuser-1", "diffuser-2"],
        domaine: ["social_solidarite"],
      })
    );
    expect(deleteDocumentMock).not.toHaveBeenCalled();
  });

  it("indexe les diffuseurs du snapshot en dédupliquant", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(
      buildMission({
        missionDiffusions: [{ distributionPublisherId: "diffuser-1" }, { distributionPublisherId: "diffuser-1" }, { distributionPublisherId: "diffuser-2" }],
      })
    );
    upsertDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(upsertDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ distributionPublisherIds: ["diffuser-1", "diffuser-2"] }));
  });

  it("indexe un tableau vide de diffuseurs quand la mission n'est dans aucun snapshot", async () => {
    prismaMock.mission.findUnique.mockResolvedValue(buildMission({ missionDiffusions: [] }));
    upsertDocumentMock.mockResolvedValue(undefined);

    await missionIndexService.upsert("mission-1");

    expect(upsertDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ distributionPublisherIds: [] }));
  });
});
