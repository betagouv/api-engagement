import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMissionsBy: vi.fn(),
  createMission: vi.fn(),
  updateMission: vi.fn(),
  createMissionEvents: vi.fn(),
  findPublisherOrganizations: vi.fn(),
  buildPublisherOrganizationPayload: vi.fn(),
  isPublisherOrganizationUpToDate: vi.fn(),
  upsertPublisherOrganizationPayload: vi.fn(),
  getMissionChanges: vi.fn(),
}));

vi.mock("../../../../services/mission", () => ({
  missionService: {
    findMissionsBy: mocks.findMissionsBy,
    create: mocks.createMission,
    update: mocks.updateMission,
  },
}));

vi.mock("../../../../services/mission-event", () => ({
  missionEventService: {
    createMissionEvents: mocks.createMissionEvents,
  },
}));

vi.mock("../../../../repositories/publisher-organization", () => ({
  publisherOrganizationRepository: {
    findMany: mocks.findPublisherOrganizations,
  },
}));

vi.mock("../organization", () => ({
  buildPublisherOrganizationPayload: mocks.buildPublisherOrganizationPayload,
  isPublisherOrganizationUpToDate: mocks.isPublisherOrganizationUpToDate,
  upsertPublisherOrganizationPayload: mocks.upsertPublisherOrganizationPayload,
}));

vi.mock("../../../../utils/mission", () => ({
  EVENT_TYPES: {
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
  },
  getMissionChanges: mocks.getMissionChanges,
}));

import { bulkDB } from "../db";

describe("bulkDB mission event type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildPublisherOrganizationPayload.mockReturnValue(null);
    mocks.isPublisherOrganizationUpToDate.mockReturnValue(true);
    mocks.findPublisherOrganizations.mockResolvedValue([]);
    mocks.createMissionEvents.mockResolvedValue(1);
  });

  it("tracks undelete (deletedAt -> null) as update", async () => {
    mocks.findMissionsBy.mockResolvedValue([
      {
        id: "mission-1",
        clientId: "client-1",
        organizationClientId: null,
      },
    ]);
    mocks.updateMission.mockResolvedValue({
      id: "mission-1",
      clientId: "client-1",
      organizationClientId: null,
      deletedAt: null,
    });
    mocks.getMissionChanges.mockReturnValue({
      deletedAt: {
        previous: "2026-01-05T05:15:09.598Z",
        current: null,
      },
    });

    const result = await bulkDB(
      [{ clientId: "client-1", organizationClientId: null } as any],
      { id: "publisher-1", name: "Publisher 1" } as any,
      { createdCount: 0, updatedCount: 0, deletedCount: 0 } as any,
      { recordMissionEvents: true }
    );

    expect(result).toBe(true);
    expect(mocks.createMissionEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        missionId: "mission-1",
        type: "update",
      }),
    ]);
  });
});
