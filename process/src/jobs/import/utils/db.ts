import prisma from "../../../db/postgres";
import { captureException } from "../../../error";
import MissionModel from "../../../models/mission";
import { Import, Mission, Mission as MongoMission, Publisher } from "../../../types";
import { MissionTransformResult, transformMongoMissionToPg } from "./transformers";

/**
 * Import a batch of missions into databases
 * NB: MongoDB is always written, PostgreSQL is written only in production
 */
export const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  try {
    const startedAt = new Date();
    await writeMongo(bulk, publisher, importDoc);
    console.log(`[${publisher.name}] Mongo write took ${((new Date().getTime() - startedAt.getTime()) / 1000).toFixed(2)}s`);
    await writePg(publisher, importDoc);
    console.log(`[${publisher.name}] Postgres write took ${((new Date().getTime() - startedAt.getTime()) / 1000).toFixed(2)}s`);
  } catch (error) {
    captureException(`[${publisher.name}] Import failed`, JSON.stringify(error, null, 2));
    return;
  }
};

/**
 * Write missions to MongoDB and update import statistics
 * We use bulkWriteWithHistory to keep history of changes. See history-plugin.ts.
 */
const writeMongo = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  // Cast to any to resolve TypeScript error, as bulkWriteWithHistory is added dynamically to the model.
  const mongoBulk = bulk.filter((e) => e).map((e) => (e._id ? { updateOne: { filter: { _id: e._id }, update: { $set: e }, upsert: true } } : { insertOne: { document: e } }));

  const mongoUpdateRes = await (MissionModel as any)
    .withHistoryContext({
      reason: `Import XML (${publisher.name})`,
    })
    .bulkWrite(mongoBulk);

  importDoc.createdCount = mongoUpdateRes.upsertedCount + mongoUpdateRes.insertedCount;
  importDoc.updatedCount = mongoUpdateRes.modifiedCount;
  console.log(`[${publisher.name}] Mongo bulk write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}`);

  if (mongoUpdateRes.hasWriteErrors()) {
    captureException(`Mongo bulk failed`, JSON.stringify(mongoUpdateRes.getWriteErrors(), null, 2));
  }

  // Mark as deleted missions that were not updated during import
  console.log(`[${publisher.name}] Cleaning Mongo missions...`);
  const mongoDeleteRes = await MissionModel.updateMany(
    { publisherId: publisher._id, deletedAt: null, updatedAt: { $lt: importDoc.startedAt } },
    { deleted: true, deletedAt: importDoc.startedAt }
  );

  importDoc.deletedCount = mongoDeleteRes.modifiedCount;
  console.log(`[${publisher.name}] Mongo cleaning removed ${importDoc.deletedCount}`);
};

/**
 * Write missions to PostgreSQL
 * This includes creating new missions and related data, updating existing ones, and cleaning up old ones
 */
const writePg = async (publisher: Publisher, importDoc: Import) => {
  const partner = await prisma.partner.findUnique({ where: { old_id: publisher._id.toString() } });
  if (!partner) {
    captureException(`Partner ${publisher._id.toString()} not found`);
    return;
  }

  // Find newly created missions in MongoDB
  const newMongoMissions = await MissionModel.find({
    publisherId: publisher._id,
    createdAt: { $gte: importDoc.startedAt },
  }).lean();
  console.log(`[${publisher.name}] Postgres ${newMongoMissions.length} missions just created in Mongo`);

  // Extract unique organization IDs from missions
  const organizationIds = [] as string[];
  newMongoMissions.forEach((e) => {
    if (e && e.organizationId && !organizationIds.includes(e.organizationId)) {
      organizationIds.push(e.organizationId);
    }
  });
  console.log(`[${publisher.name}] Postgres ${organizationIds.length} organizations to find`);

  // Find organizations in PostgreSQL
  const organizations = await prisma.organization.findMany({
    where: { old_id: { in: organizationIds } },
  });
  console.log(`[${publisher.name}] Postgres found ${organizations.length} organizations`);

  // Transform MongoDB missions to PostgreSQL format
  const pgCreate = [] as MissionTransformResult[];
  newMongoMissions.forEach((e) => {
    const res = transformMongoMissionToPg(e as MongoMission, partner.id, organizations);
    if (res) {
      pgCreate.push(res);
    }
  });

  // Create missions in PostgreSQL
  const res = await prisma.mission.createManyAndReturn({
    data: pgCreate.map((e) => e.mission),
    skipDuplicates: true,
  });
  console.log(`[${publisher.name}] Postgres created ${res.length} missions`);

  // Create addresses for missions
  const pgCreateAddresses = pgCreate
    .map((e) => {
      const mission = res.find((r) => r.old_id === e.mission.old_id);
      if (!mission) {
        return [];
      }

      e.addresses.forEach((a) => {
        a.mission_id = mission.id;
      });

      return e.addresses;
    })
    .flat();

  const resAddresses = await prisma.address.createMany({ data: pgCreateAddresses });
  console.log(`[${publisher.name}] Postgres created ${resAddresses.count} addresses`);

  // Create history entries for missions
  const pgCreateHistory = pgCreate
    .map((e) => {
      const mission = res.find((r) => r.old_id === e.mission.old_id);
      if (!mission) {
        return [];
      }

      // Set the mission_id for each history entry
      return e.history.map((h) => ({
        ...h,
        mission_id: mission.id,
      }));
    })
    .flat();

  const resHistory = await prisma.missionHistoryEvent.createMany({ data: pgCreateHistory });
  console.log(`[${publisher.name}] Postgres created ${resHistory.count} history entries`);

  // Find updated missions in MongoDB
  const updatedMongoMissions = await MissionModel.find({
    publisherId: publisher._id,
    updatedAt: { $gte: importDoc.startedAt },
    createdAt: { $lt: importDoc.startedAt },
    deletedAt: null,
  }).lean();
  console.log(`[${publisher.name}] Postgres ${updatedMongoMissions.length} missions to update in Mongo`);

  // Prepare PG update query
  const pgUpdate = updatedMongoMissions.map((e) => transformMongoMissionToPg(e as MongoMission, partner.id, organizations)).filter((e) => e !== null);

  let updated = 0;
  for (let i = 0; i < pgUpdate.length; i += 200) {
    console.log(`[${publisher.name}] Postgres updating chunk ${i} of ${pgUpdate.length} (${updated} missions updated)`);

    const chunk = pgUpdate.slice(i, i + 200);
    const missionsIds = {} as Record<string, string>;

    for (const obj of chunk) {
      try {
        const mission = await prisma.mission.upsert({
          where: { old_id: obj.mission.old_id },
          update: obj.mission,
          create: obj.mission,
        });

        missionsIds[obj.mission.old_id] = mission.id;
        updated++;
      } catch (error) {
        captureException(error, `[${publisher.name}] Error while updating mission ${obj?.mission?.old_id}`);
      }
    }

    await prisma.address.deleteMany({ where: { mission_id: { in: Object.values(missionsIds) } } });
    await prisma.address.createMany({
      data: chunk.flatMap((e) => e?.addresses.map((a) => ({ ...a, mission_id: missionsIds[e.mission.old_id] }))),
    });

    await prisma.missionHistoryEvent.deleteMany({ where: { mission_id: { in: Object.values(missionsIds) } } });
    await prisma.missionHistoryEvent.createMany({
      data: chunk.flatMap((e) => e.history.map((h) => ({ ...h, mission_id: missionsIds[e.mission.old_id] }))),
    });
  }

  console.log(`[${publisher.name}] Postgres ${updated} missions updated`);

  // Mark as deleted missions that were not updated during import
  console.log(`[${publisher.name}] Postgres deleting missions...`);
  const pgDeleteRes = await prisma.mission.updateMany({
    where: {
      updated_at: { lte: importDoc.startedAt },
      deleted_at: null,
      partner_id: partner.id,
    },
    data: { deleted_at: importDoc.startedAt },
  });
  console.log(`[${publisher.name}] Postgres deleted ${pgDeleteRes.count} missions`);
};
