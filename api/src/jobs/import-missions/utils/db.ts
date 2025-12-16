import { Import as PrismaImport } from "../../../db/core";
import { captureException } from "../../../error";
import { missionService } from "../../../services/mission";
import { missionEventService } from "../../../services/mission-event";
import type { MissionRecord } from "../../../types/mission";
import { MissionCreateInput, MissionUpdatePatch } from "../../../types/mission";
import { MissionEventCreateParams } from "../../../types/mission-event";
import type { PublisherRecord } from "../../../types/publisher";
import { getJobTime } from "../../../utils/job";
import { EVENT_TYPES, getMissionChanges } from "../../../utils/mission";
import type { ImportedMission } from "../types";

/**
 * Insert or update a batch of missions into MongoDB
 *
 * @param bulk - Array of missions to import
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 * @returns true if the import was successful, false otherwise
 */
export const bulkDB = async (bulk: ImportedMission[], publisher: PublisherRecord, importDoc: PrismaImport): Promise<boolean> => {
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
    console.log(`[${publisher.name}] Found ${existingMap.size} existing missions in mongo`);

    const missionEvents: MissionEventCreateParams[] = [];

    for (const e of bulk) {
      if (!e) {
        continue;
      }
      const missionInput = e as MissionRecord;

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
        continue;
      }

      const changes = getMissionChanges(current, missionInput);
      if (changes) {
        const updated = await missionService.update(current.id, missionInput as MissionUpdatePatch);
        existingMap.set(missionInput.clientId, updated);
        missionEvents.push({
          missionId: current.id,
          type: changes.deletedAt?.current === null ? EVENT_TYPES.DELETE : EVENT_TYPES.UPDATE,
          changes,
        });
        importDoc.updatedCount += 1;
      }
    }

    if (missionEvents.length > 0) {
      await missionEventService.createMissionEvents(missionEvents);
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
 * Clean missions in MongoDB
 * All missions related to given publisher and not in the bulk are deleted
 *
 * @param missionsClientIds - Array of mission clientIds
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 */
export const cleanDB = async (missionsClientIds: string[], publisher: PublisherRecord, importDoc: PrismaImport) => {
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
      changes: {
        deletedAt: { previous: null, current: importDoc.startedAt },
      },
    });
  }

  for (const mission of missions) {
    await missionService.update(mission.id, { deletedAt: importDoc.startedAt } as MissionUpdatePatch);
  }

  if (events.length > 0) {
    await missionEventService.createMissionEvents(events);
  }

  importDoc.deletedCount = missions.length;
  console.log(`[${publisher.name}] Mission cleaning removed ${missions.length}`);
};
