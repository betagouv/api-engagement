import { captureException } from "../../../error";
import MissionModel from "../../../models/mission";
import { Import, Mission, Publisher } from "../../../types";
import { missionsAreEqual } from "./mission";

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
    const mongoBulk = bulk
      .filter((e) => e)
      .map((e) => {
        const current = e._id ? existingMap.get(e.clientId) : null;
        if (e._id && current && missionsAreEqual(current, e)) {
          // No change : skip update
          return null;
        }
        return e._id
          ? { updateOne: { filter: { _id: e._id }, update: { $set: { ...e, updatedAt: startedAt } }, upsert: true } }
          : { insertOne: { document: { ...e, createdAt: startedAt, updatedAt: startedAt } } };
      })
      .filter(Boolean);

    if (mongoBulk.length > 0) {
      const res = await (MissionModel as any)
        .withHistoryContext({
          reason: `Import XML (${publisher.name})`,
        })
        .bulkWrite(mongoBulk, { ordered: false }); // ordered: false to avoid stopping the import if one mission fails

      if (res.hasWriteErrors()) {
        captureException("Mongo bulk failed", JSON.stringify(res.getWriteErrors(), null, 2));
      }

      importDoc.createdCount += res.upsertedCount + res.insertedCount;
      importDoc.updatedCount += res.modifiedCount;
      const time = ((new Date().getTime() - startedAt.getTime()) / 1000).toFixed(2);
      console.log(`[${publisher.name}] Mongo bulk write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}, took ${time}s`);
    }
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
 * @param bulk - Array of imported missions
 * @param publisher - Publisher of the missions
 * @param importDoc - Import document to update
 */
export const cleanDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  console.log(`[${publisher.name}] Cleaning Mongo missions...`);

  const res = await MissionModel.updateMany(
    { publisherId: publisher._id, deletedAt: null, clientId: { $nin: bulk.map((e) => e.clientId) } },
    { deleted: true, deletedAt: importDoc.startedAt }
  );

  importDoc.deletedCount = res.modifiedCount;
  console.log(`[${publisher.name}] Mongo cleaning removed ${res.modifiedCount}`);
};
