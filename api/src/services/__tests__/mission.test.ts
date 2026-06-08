import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueMock, captureExceptionMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

const { missionRepositoryMock, activityServiceMock, missionEventServiceMock } = vi.hoisted(() => ({
  missionRepositoryMock: {
    createUnchecked: vi.fn(),
    findFirst: vi.fn(),
    updateUnchecked: vi.fn(),
  },
  activityServiceMock: {
    addMissionActivities: vi.fn(),
    getOrCreateActivities: vi.fn(),
    replaceMissionActivities: vi.fn(),
  },
  missionEventServiceMock: {
    createMissionEvent: vi.fn(),
  },
}));

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: { enqueue: enqueueMock },
  buildMissionEnrichmentScoringWhere: vi.fn(),
}));

vi.mock("@/error", () => ({
  captureException: captureExceptionMock,
}));

vi.mock("@/repositories/mission", () => ({
  missionRepository: missionRepositoryMock,
}));

vi.mock("@/services/activity", () => ({
  activityService: activityServiceMock,
}));

vi.mock("@/services/mission-event", () => ({
  missionEventService: missionEventServiceMock,
}));

import { missionService } from "@/services/mission";

const rawMission = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "mission-1",
    clientId: "client-1",
    publisherId: "publisher-1",
    title: "Titre initial",
    description: "Description initiale",
    descriptionHtml: null,
    tags: [],
    tasks: [],
    audience: [],
    softSkills: [],
    requirements: [],
    romeSkills: [],
    reducedMobilityAccessible: null,
    closeToTransport: null,
    openToMinors: null,
    remote: "no",
    schedule: null,
    duration: null,
    postedAt: null,
    startAt: null,
    endAt: null,
    priority: null,
    places: 10,
    placesStatus: "GIVEN_BY_PARTNER",
    metadata: null,
    domainOriginal: null,
    domainLogo: null,
    type: "benevolat",
    snu: false,
    snuPlaces: null,
    compensationAmount: null,
    compensationAmountMax: null,
    compensationUnit: null,
    compensationType: null,
    lastSyncAt: null,
    applicationUrl: null,
    statusCode: "ACCEPTED",
    statusComment: null,
    deletedAt: null,
    lastExportedToPgAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    publisher: null,
    domain: null,
    activities: [],
    publisherOrganization: null,
    addresses: [],
    moderationStatuses: [],
    jobBoards: [],
    ...overrides,
  }) as any;

const resetMutationMocks = () => {
  missionRepositoryMock.createUnchecked.mockReset();
  missionRepositoryMock.findFirst.mockReset();
  missionRepositoryMock.updateUnchecked.mockReset();
  activityServiceMock.addMissionActivities.mockReset();
  activityServiceMock.getOrCreateActivities.mockReset();
  activityServiceMock.replaceMissionActivities.mockReset();
  missionEventServiceMock.createMissionEvent.mockReset();
  enqueueMock.mockReset();
};

describe("missionService.enqueueMissionProcessing", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it("délègue l'enqueue au service d'enrichissement", async () => {
    enqueueMock.mockResolvedValue(undefined);

    await missionService.enqueueMissionProcessing("mission-1");

    expect(enqueueMock).toHaveBeenCalledWith("mission-1");
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("ne propage pas l'erreur si la queue est indisponible (best-effort)", async () => {
    const error = new Error("You do not have sufficient access to perform this action.");
    enqueueMock.mockRejectedValue(error);

    await expect(missionService.enqueueMissionProcessing("mission-1")).resolves.toBeUndefined();

    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      extra: { context: "enqueueMissionProcessing", missionId: "mission-1" },
    });
  });
});

describe("missionService.create", () => {
  beforeEach(() => {
    resetMutationMocks();
  });

  it("crée un mission_event create et publie l'enrichissement", async () => {
    missionRepositoryMock.findFirst.mockResolvedValueOnce(rawMission({ id: "created-mission" }));

    await missionService.create({
      id: "created-mission",
      clientId: "client-created",
      publisherId: "publisher-1",
      title: "Mission créée",
    });

    expect(missionEventServiceMock.createMissionEvent).toHaveBeenCalledWith({
      missionId: "created-mission",
      type: "create",
      changes: null,
    });
    expect(enqueueMock).toHaveBeenCalledWith("created-mission");
  });
});

describe("missionService.update", () => {
  beforeEach(() => {
    resetMutationMocks();
  });

  it("ne crée pas d'event et ne publie pas d'enrichissement si le patch ne change rien", async () => {
    const mission = rawMission({ places: 10 });
    missionRepositoryMock.findFirst.mockResolvedValueOnce(mission).mockResolvedValueOnce(mission);

    await missionService.update("mission-1", { places: 10 });

    expect(missionEventServiceMock.createMissionEvent).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("crée un event update et publie l'enrichissement si un champ prompt change", async () => {
    missionRepositoryMock.findFirst.mockResolvedValueOnce(rawMission({ title: "Titre initial" })).mockResolvedValueOnce(rawMission({ title: "Titre modifié" }));

    await missionService.update("mission-1", { title: "Titre modifié" });

    expect(missionEventServiceMock.createMissionEvent).toHaveBeenCalledWith({
      missionId: "mission-1",
      type: "update",
      changes: expect.objectContaining({
        title: { previous: "Titre initial", current: "Titre modifié" },
      }),
    });
    expect(enqueueMock).toHaveBeenCalledWith("mission-1");
  });

  it("crée un event update sans enrichissement si seuls des champs hors-prompt changent", async () => {
    missionRepositoryMock.findFirst.mockResolvedValueOnce(rawMission({ places: 10 })).mockResolvedValueOnce(rawMission({ places: 12 }));

    await missionService.update("mission-1", { places: 12 });

    expect(missionEventServiceMock.createMissionEvent).toHaveBeenCalledWith({
      missionId: "mission-1",
      type: "update",
      changes: expect.objectContaining({
        places: { previous: 10, current: 12 },
      }),
    });
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("crée un event delete et publie l'enrichissement quand deletedAt est renseigné", async () => {
    const deletedAt = new Date("2026-06-01T00:00:00.000Z");
    missionRepositoryMock.findFirst.mockResolvedValueOnce(rawMission({ deletedAt: null })).mockResolvedValueOnce(rawMission({ deletedAt }));

    await missionService.update("mission-1", { deletedAt });

    expect(missionEventServiceMock.createMissionEvent).toHaveBeenCalledWith({
      missionId: "mission-1",
      type: "delete",
      changes: expect.objectContaining({
        deletedAt: { previous: null, current: deletedAt },
      }),
    });
    expect(enqueueMock).toHaveBeenCalledWith("mission-1");
  });
});
