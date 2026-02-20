import { Import as PrismaImport } from "@/db/core";
import type { PublisherOrganization } from "@/db/core";
import { captureException } from "@/error";
import { missionService } from "@/services/mission";
import { missionEventService } from "@/services/mission-event";
import { publisherOrganizationRepository } from "@/repositories/publisher-organization";
import type { MissionRecord } from "@/types/mission";
import { MissionCreateInput, MissionUpdatePatch } from "@/types/mission";
import { MissionEventCreateParams } from "@/types/mission-event";
import type { PublisherRecord } from "@/types/publisher";
import { getJobTime } from "@/utils/job";
import { EVENT_TYPES, getMissionChanges } from "@/utils/mission";
import { normalizeOptionalString } from "@/utils/normalize";
import { buildPublisherOrganizationPayload, isPublisherOrganizationUpToDate, upsertPublisherOrganizationPayload } from "@/jobs/import-missions/utils/organization";
import type { ImportedMission } from "@/jobs/import-missions/types";

/**
 * Insert or update a batch of missions into MongoDB
 *
 * @param bulk - Array of missions to import
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 * @returns true if the import was successful, false otherwise
 */
export const bulkDB = async (
  bulk: ImportedMission[],
  publisher: PublisherRecord,
  importDoc: PrismaImport,
  options: { recordMissionEvents: boolean }
): Promise<boolean> => {
  try {
    const startedAt = new Date();
    console.log(`[${publisher.name}] Starting ${bulk.length} missions import at ${startedAt.toISOString()}`);

    const clientIds = bulk.filter((e) => e && e.clientId).map((e) => e.clientId);
    const existingMissions = clientIds.length
      ? await missionService.findMissionsBy({
          publisherId: publisher.id,
          clientId: { in: clientIds },
        })
      : [];
    const existingMap = new Map(existingMissions.map((m) => [m.clientId, m]));
    console.log(`[${publisher.name}] Found ${existingMap.size} existing missions in DB`);

    const missionEvents: MissionEventCreateParams[] = [];
    const upsertStartedAt = new Date();
    let upsertedCount = 0;
    let organizationUpsertCount = 0;
    let organizationUpsertMs = 0;
    let missionChangesCount = 0;
    let missionChangesMs = 0;
    let publisherOrganizationsByClientId = new Map<string, PublisherOrganization>();
    const organizationPayloadsByClientId = new Map<string, NonNullable<ReturnType<typeof buildPublisherOrganizationPayload>>>();

    for (const mission of bulk) {
      const payload = buildPublisherOrganizationPayload(mission);
      if (payload) {
        organizationPayloadsByClientId.set(payload.organizationClientId, payload);
      }
    }
    if (organizationPayloadsByClientId.size > 0) {
      const existingPublisherOrganizations = await publisherOrganizationRepository.findMany({
        where: {
          publisherId: publisher.id,
          organizationClientId: { in: Array.from(organizationPayloadsByClientId.keys()) },
        },
      });
      publisherOrganizationsByClientId = new Map(
        existingPublisherOrganizations.map((organization) => [organization.organizationClientId, organization])
      );
    }
    const processedOrganizationClientIds = new Set<string>();

    for (const e of bulk) {
      if (!e) {
        continue;
      }
      const missionInput = e as MissionRecord;
      missionInput.organizationClientId = normalizeOptionalString(missionInput.organizationClientId ?? undefined) ?? null;

      const organizationClientId = normalizeOptionalString(missionInput.organizationClientId ?? undefined);
      if (organizationClientId && !processedOrganizationClientIds.has(organizationClientId)) {
        processedOrganizationClientIds.add(organizationClientId);
        const payload = organizationPayloadsByClientId.get(organizationClientId);
        if (payload) {
          const existing = publisherOrganizationsByClientId.get(organizationClientId);
          if (!existing || !isPublisherOrganizationUpToDate(existing, payload.update)) {
            const organizationUpsertStartedAt = Date.now();
            await upsertPublisherOrganizationPayload(payload);
            organizationUpsertMs += Date.now() - organizationUpsertStartedAt;
            organizationUpsertCount += 1;
          }
        }
      }

      const current = existingMap.get(missionInput.clientId);
      if (!current) {
        const created = await missionService.create(missionInput as MissionCreateInput);
        existingMap.set(missionInput.clientId, created);
        missionEvents.push({
          missionId: created.id,
          type: EVENT_TYPES.CREATE,
          changes: null,
        });
        importDoc.createdCount += 1;
        upsertedCount += 1;
        continue;
      }

      const changesStartedAt = Date.now();
      const changes = getMissionChanges(current, missionInput);
      missionChangesMs += Date.now() - changesStartedAt;
      missionChangesCount += 1;
      if (changes) {
        const updated = await missionService.update(current.id, missionInput as MissionUpdatePatch);
        existingMap.set(missionInput.clientId, updated);
        missionEvents.push({
          missionId: current.id,
          type: changes.deletedAt?.current === null ? EVENT_TYPES.DELETE : EVENT_TYPES.UPDATE,
          changes,
        });
        importDoc.updatedCount += 1;
        upsertedCount += 1;
      }
    }

    console.log(`[${publisher.name}] Mission writes done: ${upsertedCount}/${bulk.length} in ${getJobTime(upsertStartedAt)}`);
    console.log(
      `[${publisher.name}] Organization upserts: ${organizationUpsertCount}/${bulk.length} in ${(organizationUpsertMs / 1000).toFixed(2)}s`
    );
    console.log(
      `[${publisher.name}] Mission changes checks: ${missionChangesCount}/${bulk.length} in ${(missionChangesMs / 1000).toFixed(2)}s`
    );

    if (options.recordMissionEvents && missionEvents.length > 0) {
      const eventsStartedAt = new Date();
      await missionEventService.createMissionEvents(missionEvents);
      console.log(`[${publisher.name}] Mission events created: ${missionEvents.length} in ${getJobTime(eventsStartedAt)}`);
    }

    const time = getJobTime(startedAt);
    console.log(`[${publisher.name}] Mission write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}, took ${time}`);
    return true;
  } catch (error) {
    captureException(error, { extra: { publisher } });
    return false;
  }
};

/**
 * Clean missions in DB
 * All missions related to given publisher and not in the bulk are deleted
 *
 * @param missionsClientIds - Array of mission clientIds
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 */
export const cleanDB = async (
  missionsClientIds: string[],
  publisher: PublisherRecord,
  importDoc: PrismaImport,
  options: { recordMissionEvents: boolean }
) => {
  console.log(`[${publisher.name}] Cleaning missions...`);

  const missions = await missionService.findMissionsBy({
    publisherId: publisher.id,
    deletedAt: null,
    ...(missionsClientIds.length ? { clientId: { notIn: missionsClientIds } } : {}),
  });

  const events: MissionEventCreateParams[] = [];
  for (const mission of missions) {
    events.push({
      missionId: mission.id,
      type: EVENT_TYPES.DELETE,
      changes: { deletedAt: true },
    });
  }

  const cleanStartedAt = new Date();
  for (const mission of missions) {
    await missionService.update(mission.id, { deletedAt: importDoc.startedAt } as MissionUpdatePatch);
  }
  console.log(`[${publisher.name}] Mission clean updates done: ${missions.length} in ${getJobTime(cleanStartedAt)}`);

  if (options.recordMissionEvents && events.length > 0) {
    const eventsStartedAt = new Date();
    await missionEventService.createMissionEvents(events);
    console.log(`[${publisher.name}] Mission clean events created: ${events.length} in ${getJobTime(eventsStartedAt)}`);
  }

  importDoc.deletedCount = missions.length;
  console.log(`[${publisher.name}] Mission cleaning removed ${missions.length}`);
};
