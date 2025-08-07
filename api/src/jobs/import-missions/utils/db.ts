import { captureException } from "../../../error";
import MissionModel from "../../../models/mission";
import MissionEventModel from "../../../models/mission-event";
import { Import, Mission, Publisher } from "../../../types";
import { getJobTime } from "../../../utils/job";
import { getMissionChanges } from "../../../utils/mission";

/**
 * Insert or update a batch of missions into MongoDB
 *
 * @param bulk - Array of missions to import
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 * @returns true if the import was successful, false otherwise
 */
export const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import): Promise<boolean> => {
  try {
    const startedAt = new Date();
    console.log(`[${publisher.name}] Starting mongo write at ${startedAt.toISOString()}`);

    // Get existing missions in DB, to compare with new missions
    const clientIds = bulk.filter((e) => e && e.clientId).map((e) => e.clientId);
    const existingMissions = await MissionModel.find({
      publisherId: publisher._id,
      clientId: { $in: clientIds },
    }).lean();
    const existingMap = new Map(existingMissions.map((m) => [m.clientId, m]));

    // Build bulk write operations
    const missionBulk = [] as any[];
    const missionEventsBulk = [] as any[];

    for (const e of bulk) {
      if (!e) {
        continue;
      }

      if (!e._id) {
        missionBulk.push({ insertOne: { document: { ...e, createdAt: startedAt, updatedAt: startedAt } } });
        continue;
      }

      const current = existingMap.get(e.clientId);
      if (!current) {
        missionBulk.push({ insertOne: { document: { ...e, createdAt: startedAt, updatedAt: startedAt } } });
        continue;
      }

      const changes = getMissionChanges(current, e);
      if (changes) {
        missionBulk.push({ updateOne: { filter: { _id: current._id }, update: { $set: { ...e, updatedAt: startedAt } }, upsert: true } });
        missionEventsBulk.push({
          insertOne: {
            document: {
              missionId: current._id,
              type: changes.deletedAt?.current === null ? "delete" : "update",
              changes,
              fields: Object.keys(changes),
            },
          },
        });
      }
    }

    if (missionBulk.length > 0) {
      const resMission = await MissionModel.bulkWrite(missionBulk, { ordered: false }); // ordered: false to avoid stopping the import if one mission fails

      if (resMission.hasWriteErrors()) {
        captureException("Mongo bulk failed", JSON.stringify(resMission.getWriteErrors(), null, 2));
      }

      Object.values(resMission.insertedIds).forEach((id) => {
        missionEventsBulk.push({
          insertOne: {
            document: { missionId: id, type: "create", changes: null, fields: [] },
          },
        });
      });

      importDoc.createdCount += resMission.upsertedCount + resMission.insertedCount;
      importDoc.updatedCount += resMission.modifiedCount;
    }

    if (missionEventsBulk.length > 0) {
      const resMissionEvents = await (MissionEventModel as any).bulkWrite(missionEventsBulk, { ordered: false }); // ordered: false to avoid stopping the import if one mission fails

      if (resMissionEvents.hasWriteErrors()) {
        captureException("Mongo bulk failed", JSON.stringify(resMissionEvents.getWriteErrors(), null, 2));
      }
    }

    const time = getJobTime(startedAt);
    console.log(`[${publisher.name}] Mongo bulk write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}, took ${time}`);
    return true;
  } catch (error) {
    captureException(`[${publisher.name}] Import failed`, JSON.stringify(error, null, 2));
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
export const cleanDB = async (missionsClientIds: string[], publisher: Publisher, importDoc: Import) => {
  console.log(`[${publisher.name}] Cleaning Mongo missions...`);

  const res = await MissionModel.updateMany(
    { publisherId: publisher._id, deletedAt: null, clientId: { $nin: missionsClientIds } },
    { deleted: true, deletedAt: importDoc.startedAt }
  );

  importDoc.deletedCount = res.modifiedCount;
  console.log(`[${publisher.name}] Mongo cleaning removed ${res.modifiedCount}`);
};
