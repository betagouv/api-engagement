import { randomUUID } from "crypto";

import { prisma } from "@/db/postgres";
import { missionService } from "@/services/mission";
import { statEventService } from "@/services/stat-event";
import { StatEventRecord } from "@/types";
import { createTestMission, createTestPublisher } from "./index";

export async function createStatEventFixture(overrides: Partial<StatEventRecord> = {}) {
  const ensurePublisherExists = async (id: string, name?: string) => {
    const existing = await prisma.publisher.findUnique({ where: { id } });
    if (existing) {
      return existing.id;
    }
    return (await createTestPublisher({ id, name })).id;
  };

  const fromPublisherId = overrides.fromPublisherId ?? (await createTestPublisher({ name: overrides.fromPublisherName })).id;
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
      // createTestMission creates a MissionModerationStatus linked to the JVA publisher
      await ensurePublisherExists("5f5931496c7ea514150a818f");
      await createTestMission({
        id: overrides.missionId,
        publisherId: toPublisherId,
        clientId: overrides.missionClientId ?? `client-${overrides.missionId}`,
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
    missionId: overrides.missionId,
    tag: overrides.tag,
    tags: overrides.tags ?? [],
    exportToAnalytics: overrides.exportToAnalytics,
    clientEventId: overrides.clientEventId,
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
