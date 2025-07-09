import { Address, MissionHistoryEvent } from "@prisma/client";
import prisma from "../../../db/postgres";
import { captureException } from "../../../error";
import MissionModel from "../../../models/mission";
import { Import, Mission, Mission as MongoMission, Publisher } from "../../../types";
import { MissionTransformResult, transformMongoMissionToPg } from "./transformers";

/**
 * Import a batch of missions into databases
 * NB: MongoDB is always written, PostgreSQL is written only in production
 */
export const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import): Promise<boolean> => {
  try {
    const startedAt = new Date();
    console.log(`[${publisher.name}] Starting mongo write at ${startedAt.toISOString()}`);
    const res = await writeMongo(bulk, publisher, startedAt);
    importDoc.createdCount += res.upsertedCount + res.insertedCount;
    importDoc.updatedCount += res.modifiedCount;
    const time = ((new Date().getTime() - startedAt.getTime()) / 1000).toFixed(2);
    console.log(`[${publisher.name}] Mongo bulk write created ${importDoc.createdCount}, updated ${importDoc.updatedCount}, took ${time}s`);

    await writePg(publisher, startedAt);
    return true;
  } catch (error) {
    captureException(`[${publisher.name}] Import failed`, JSON.stringify(error, null, 2));
    return false;
  }
};

export const cleanDB = async (publisher: Publisher, importDoc: Import) => {
  console.log(`[${publisher.name}] Cleaning Mongo missions...`);
  const res = await cleanMongo(publisher, importDoc);
  importDoc.deletedCount = res.modifiedCount;
  console.log(`[${publisher.name}] Mongo cleaning removed ${res.modifiedCount}`);

  await cleanPg(publisher, importDoc);
};

/**
 * Write missions to MongoDB and update import statistics
 * We use bulkWriteWithHistory to keep history of changes. See history-plugin.ts.
 */
const writeMongo = async (bulk: Mission[], publisher: Publisher, startedAt: Date) => {
  // Cast to any to resolve TypeScript error, as bulkWriteWithHistory is added dynamically to the model.

  const mongoBulk = bulk
    .filter((e) => e)
    .map((e) =>
      e._id
        ? { updateOne: { filter: { _id: e._id }, update: { $set: { ...e, updatedAt: startedAt } }, upsert: true } }
        : { insertOne: { document: { ...e, createdAt: startedAt, updatedAt: startedAt } } }
    );

  const mongoUpdateRes = await (MissionModel as any)
    .withHistoryContext({
      reason: `Import XML (${publisher.name})`,
    })
    .bulkWrite(mongoBulk, { ordered: false }); // ordered: false to avoid stopping the import if one mission fails

  if (mongoUpdateRes.hasWriteErrors()) {
    captureException("Mongo bulk failed", JSON.stringify(mongoUpdateRes.getWriteErrors(), null, 2));
  }
  return mongoUpdateRes;
};

const cleanMongo = async (publisher: Publisher, importDoc: Import) => {
  const mongoDeleteRes = await MissionModel.updateMany(
    { publisherId: publisher._id, deletedAt: null, updatedAt: { $lt: importDoc.startedAt } },
    { deleted: true, deletedAt: importDoc.startedAt }
  );
  return mongoDeleteRes;
};

const PG_CHUNK_SIZE = 200;
/**
 * Write missions to PostgreSQL
 * This includes creating new missions and related data, updating existing ones, and cleaning up old ones
 */
const writePg = async (publisher: Publisher, startedAt: Date) => {
  const partner = await prisma.partner.findUnique({ where: { old_id: publisher._id.toString() } });
  if (!partner) {
    captureException(`Partner ${publisher._id.toString()} not found`);
    return;
  }

  // Find newly created missions in MongoDB
  const newMongoMissions = await MissionModel.find({
    publisherId: publisher._id,
    createdAt: { $gte: startedAt },
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

      return e.addresses.map((a) => ({
        ...a,
        mission_id: mission.id,
      }));
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
    updatedAt: { $gte: startedAt },
    createdAt: { $lt: startedAt },
    deletedAt: null,
  }).lean();
  console.log(`[${publisher.name}] Postgres ${updatedMongoMissions.length} missions to update in Mongo`);

  // Prepare PG update query
  const pgUpdate = updatedMongoMissions.map((e) => transformMongoMissionToPg(e as MongoMission, partner.id, organizations)).filter((e) => e !== null);

  let updated = 0;
  for (let i = 0; i < pgUpdate.length; i += PG_CHUNK_SIZE) {
    console.log(`[${publisher.name}] Postgres updating chunk ${i} of ${pgUpdate.length} (${updated} missions updated)`);

    const chunk = pgUpdate.slice(i, i + PG_CHUNK_SIZE);

    const missionsIds = [] as string[];
    const addressesToCreate = [] as Omit<Address, "id">[];
    const historyToCreate = [] as Omit<MissionHistoryEvent, "id">[];

    for (const obj of chunk) {
      try {
        const mission = await prisma.mission.upsert({
          where: { old_id: obj.mission.old_id },
          update: obj.mission,
          create: obj.mission,
        });

        missionsIds.push(mission.id);
        addressesToCreate.push(...obj.addresses.map((a) => ({ ...a, mission_id: mission.id })));
        historyToCreate.push(...obj.history.map((h) => ({ ...h, mission_id: mission.id })));
        updated++;
      } catch (error) {
        captureException(error, `[${publisher.name}] Error while updating mission ${obj?.mission?.old_id}`);
      }
    }

    try {
      await prisma.address.deleteMany({ where: { mission_id: { in: missionsIds } } });
      await prisma.address.createMany({ data: addressesToCreate });

      await prisma.missionHistoryEvent.deleteMany({ where: { mission_id: { in: missionsIds } } });
      await prisma.missionHistoryEvent.createMany({ data: historyToCreate });
    } catch (error) {
      captureException(error, `[${publisher.name}] Error while updating addresses and history for mission chunk ${i}`);
    }
  }

  console.log(`[${publisher.name}] Postgres ${updated} missions updated`);
};

const cleanPg = async (publisher: Publisher, importDoc: Import) => {
  const partner = await prisma.partner.findUnique({ where: { old_id: publisher._id.toString() } });
  if (!partner) {
    captureException(`Partner ${publisher._id.toString()} not found`);
    return;
  }

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
