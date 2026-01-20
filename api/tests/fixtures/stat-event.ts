import { randomUUID } from "crypto";

import { prismaCore } from "../../src/db/postgres";
import { statEventService } from "../../src/services/stat-event";
import { missionService } from "../../src/services/mission";
import { StatEventRecord } from "../../src/types";
import { createTestPublisher } from "./index";

export async function createStatEventFixture(overrides: Partial<StatEventRecord> = {}) {
  const ensurePublisherExists = async (id: string, name?: string) => {
    const existing = await prismaCore.publisher.findUnique({ where: { id } });
    if (existing) {
      return existing.id;
    }

    const created = await prismaCore.publisher.create({
      data: {
        id,
        name: name ?? `Test Publisher ${id.slice(0, 8)}`,
      },
    });
    return created.id;
  };

  const fromPublisherId =
    overrides.fromPublisherId ?? (await createTestPublisher({ name: overrides.fromPublisherName })).id;
  const toPublisherId = overrides.toPublisherId ?? (await createTestPublisher({ name: overrides.toPublisherName })).id;

  if (overrides.fromPublisherId) {
    await ensurePublisherExists(fromPublisherId, overrides.fromPublisherName);
  }

  if (overrides.toPublisherId) {
    await ensurePublisherExists(toPublisherId, overrides.toPublisherName);
  }

  // Ensure a mission exists if a missionId is provided to satisfy FK constraints
  if (overrides.missionId) {
    const existingMission = await missionService.findOneMission(overrides.missionId);
    if (!existingMission) {
      await missionService.create({
        id: overrides.missionId,
        clientId: overrides.missionClientId ?? `client-${overrides.missionId}`,
        publisherId: toPublisherId,
        title: overrides.missionTitle ?? "Fixture Mission",
        statusCode: "ACCEPTED",
        addresses: [
          {
            postalCode: overrides.missionPostalCode ?? "00000",
            departmentName: overrides.missionDepartmentName ?? "Unknown",
            city: "Unknown",
            country: "France",
            location: { lat: 0, lon: 0 },
            geolocStatus: "NOT_FOUND",
          },
        ],
      });
    }
  }

  const record: StatEventRecord = {
    _id: overrides._id ?? randomUUID(),
    type: overrides.type ?? "print",
    createdAt: overrides.createdAt ?? new Date(),
    origin: overrides.origin ?? "https://origin.example.com",
    referer: overrides.referer ?? "https://referrer.example.com",
    userAgent: overrides.userAgent ?? "Mozilla/5.0",
    host: overrides.host ?? "redirect.test",
    user: overrides.user ?? "stat-user",
    isBot: overrides.isBot ?? false,
    isHuman: overrides.isHuman ?? true,
    source: overrides.source ?? "publisher",
    sourceId: overrides.sourceId ?? "source-id",
    sourceName: overrides.sourceName ?? "Source Name",
    customAttributes: overrides.customAttributes,
    status: overrides.status ?? "PENDING",
    fromPublisherId,
    toPublisherId,
    missionId: overrides.missionId ?? "mission-id",
    missionClientId: overrides.missionClientId ?? "mission-client-id",
    missionDomain: overrides.missionDomain ?? "mission-domain",
    missionTitle: overrides.missionTitle ?? "Mission Title",
    missionPostalCode: overrides.missionPostalCode ?? "75000",
    missionDepartmentName: overrides.missionDepartmentName ?? "Paris",
    missionOrganizationId: overrides.missionOrganizationId ?? "mission-org-id",
    missionOrganizationName: overrides.missionOrganizationName ?? "Mission Org",
    missionOrganizationClientId: overrides.missionOrganizationClientId ?? "mission-org-client-id",
    tag: overrides.tag,
    tags: overrides.tags ?? [],
    exportToAnalytics: overrides.exportToAnalytics,
    clickId: overrides.clickId,
    clickUser: overrides.clickUser,
    requestId: overrides.requestId,
  };

  await statEventService.createStatEvent(record);
  return record;
}

export async function createClickStat(id: string, overrides: Partial<StatEventRecord> = {}) {
  return createStatEventFixture({
    _id: id,
    type: "click",
    ...overrides,
    isBot: overrides.isBot ?? false,
  });
}
