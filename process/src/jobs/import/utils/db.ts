import { Address as PgAddress, Mission as PgMission, MissionHistory as PgMissionHistory } from "@prisma/client";

import { Mission as MongoMission } from "../../../types";
import prisma from "../../../db/postgres";
import { captureException } from "../../../error";
import { Import, Mission, Publisher } from "../../../types";
import MissionModel from "../../../models/mission";
import { transformMongoMissionToPg, MissionTransformResult } from "./transformers";

/**
 * Import a batch of missions into databases
 * NB: MongoDB is always written, PostgreSQL is written only in production
 */
export const bulkDB = async (bulk: Mission[], publisher: Publisher, importDoc: Import) => {
  try {
    await writeMongo(bulk, publisher, importDoc);
    await writePg(publisher, importDoc);
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
  const mongoBulk = bulk
    .filter((e) => e)
    .map((e) => 
      e._id 
        ? { updateOne: { filter: { _id: e._id }, update: { $set: e }, upsert: true } } 
        : { insertOne: { document: e } }
    );

  const mongoUpdateRes = await (MissionModel as any).withHistoryContext({ 
    reason: `Import XML (${publisher.name})` 
  }).bulkWrite(mongoBulk);

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
    { deleted: true, deletedAt: importDoc.startedAt },
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
    createdAt: { $gte: importDoc.startedAt } 
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
    where: { old_id: { in: organizationIds } } 
  });
  console.log(`[${publisher.name}] Postgres found ${organizations.length} organizations`);

  // Transform MongoDB missions to PostgreSQL format
  const pgCreate = [] as MissionTransformResult[];
  newMongoMissions.forEach((e) => {
    const res = transformMongoMissionToPg(e as MongoMission, partner.id, organizations);
    if (res) pgCreate.push(res);
  });

  // Create missions in PostgreSQL
  const res = await prisma.mission.createManyAndReturn({ 
    data: pgCreate.map((e) => e.mission), 
    skipDuplicates: true 
  });
  console.log(`[${publisher.name}] Postgres created ${res.length} missions`);

  // Create addresses for missions
  const pgCreateAddresses = pgCreate
    .map((e) => {
      const mission = res.find((r) => r.old_id === e.mission.old_id);
      if (!mission) return [];
      
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
      if (!mission) return [];
      
      e.history.forEach((h) => {
        h.mission_id = mission.id;
      });
      
      return e.history;
    })
    .flat();
    
  const resHistory = await prisma.missionHistory.createMany({ data: 
    pgCreateHistory.map((h) => ({ 
      ...h, 
      state: h.state as any,
      metadata: h.metadata as any
    }))
  });
  console.log(`[${publisher.name}] Postgres created ${resHistory.count} history entries`);

  // Find updated missions in MongoDB
  const updatedMongoMissions = await MissionModel.find({ 
    publisherId: publisher._id, 
    updatedAt: { $gte: importDoc.startedAt }, 
    createdAt: { $lt: importDoc.startedAt } 
  }).lean();
  console.log(`[${publisher.name}] Postgres ${updatedMongoMissions.length} missions to update in Mongo`);

  // Prepare PG update query 
  const pgUpdate = updatedMongoMissions.map((e) => 
    transformMongoMissionToPg(e as MongoMission, partner.id, organizations)
  );
  
  let updated = 0;
  for (const obj of pgUpdate) {
    try {
      if (updated % 100 === 0) {
        console.log(`[${publisher.name}] Postgres ${updated} missions updated`);
      }
      
      // Upsert mission with actual data
      if (!obj) continue;
      const mission = await prisma.mission.upsert({
        where: { old_id: obj.mission.old_id },
        update: obj.mission,
        create: obj.mission,
      });
      
      // Replace addresses
      await prisma.address.deleteMany({ where: { mission_id: mission.id } });
      await prisma.address.createMany({ 
        data: obj.addresses.map((e) => ({ ...e, mission_id: mission.id })) 
      });
      
      // Replace history
      await prisma.missionHistory.deleteMany({ where: { mission_id: mission.id } });
      await prisma.missionHistory.createMany({ 
        data: obj.history.map((e) => ({ 
          ...e, 
          mission_id: mission.id,
          state: e.state as any, // Cast state to any to resolve type incompatibility with Prisma
          metadata: e.metadata as any 
        })) 
      });
      
      updated += 1;
    } catch (error) {
      console.error(error, obj?.mission?.old_id);
    }
  }

  console.log(`[${publisher.name}] Postgres ${updated} missions updated`);

  // Mark as deleted missions that were not updated during import
  console.log(`[${publisher.name}] Postgres deleting missions...`);
  const pgDeleteRes = await prisma.mission.updateMany({
    where: { 
      updated_at: { lte: importDoc.startedAt }, 
      deleted_at: null, 
      partner_id: partner.id 
    },
    data: { deleted_at: importDoc.startedAt },
  });
  console.log(`[${publisher.name}] Postgres deleted ${pgDeleteRes.count} missions`);
};
