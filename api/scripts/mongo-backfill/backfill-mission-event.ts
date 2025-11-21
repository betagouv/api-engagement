import mongoose from "mongoose";

import { Prisma } from "../../src/db/core";
import type { PrismaClient } from "../../src/db/core";
import type { MissionEventRecord } from "../../src/types/mission-event";
import { asDate, asString, toMongoObjectIdString } from "./utils/cast";
import { compareDates, compareJsons, compareStrings } from "./utils/compare";
import { toJsonValue } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const SCRIPT_NAME = "MigrateMissionEvents";
const BATCH_SIZE = 500;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), SCRIPT_NAME);
loadEnvironment(options, __dirname, SCRIPT_NAME);

type MongoMissionEventDocument = {
  _id?: { toString(): string } | string;
  missionId?: unknown;
  type?: unknown;
  changes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
};

type NormalizedMissionEventData = {
  record: MissionEventRecord;
  create: Prisma.MissionEventUncheckedCreateInput;
  update: Prisma.MissionEventUncheckedUpdateInput;
};

const mapJsonValue = (value: Prisma.InputJsonValue | null): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined => {
  if (value === null) {
    return Prisma.NullableJsonNullValueInput.DbNull;
  }
  if (value === undefined) {
    return undefined;
  }
  return value;
};

const normalizeMissionEvent = (doc: MongoMissionEventDocument): NormalizedMissionEventData => {
  const id = toMongoObjectIdString(doc._id) ?? asString(doc._id);
  if (!id) {
    throw new Error("[MigrateMissionEvents] Encountered document without a valid _id");
  }

  const missionId = toMongoObjectIdString(doc.missionId) ?? asString(doc.missionId);
  if (!missionId) {
    throw new Error(`[MigrateMissionEvents] Mission event ${id} does not have a valid missionId`);
  }

  const rawType = asString(doc.type);
  if (!rawType || !["create", "update", "delete"].includes(rawType)) {
    throw new Error(`[MigrateMissionEvents] Mission event ${id} has invalid type: ${rawType}`);
  }
  const type = rawType as MissionEventRecord["type"];

  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;
  const createdBy = toMongoObjectIdString(doc.createdBy) ?? asString(doc.createdBy);
  const changesValue = toJsonValue(doc.changes);

  const record: MissionEventRecord = {
    id,
    missionId,
    type,
    changes: (changesValue ?? null) as Prisma.JsonValue | null,
    createdAt,
    createdBy: createdBy ?? null,
    updatedAt,
  };

  const create: Prisma.MissionEventUncheckedCreateInput = {
    id: record.id,
    missionId: record.missionId,
    type: record.type,
    changes: mapJsonValue(changesValue),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
  };

  const update: Prisma.MissionEventUncheckedUpdateInput = {
    missionId: record.missionId,
    type: record.type,
    changes: mapJsonValue(changesValue),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
  };

  return { record, create, update };
};

const hasDifferences = (existing: MissionEventRecord, target: MissionEventRecord) => {
  if (!compareStrings(existing.missionId, target.missionId)) return true;
  if (existing.type !== target.type) return true;
  if (!compareJsons(existing.changes, target.changes)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  if (!compareStrings(existing.createdBy, target.createdBy)) return true;
  return false;
};

const formatRecordForLog = (record: MissionEventRecord) => ({
  id: record.id,
  missionId: record.missionId,
  type: record.type,
  createdBy: record.createdBy,
  createdAt: record.createdAt.toISOString(),
  changes: record.changes,
});

const persistBatch = async (
  batch: NormalizedMissionEventData[],
  prismaCore: PrismaClient,
  stats: { created: number; updated: number; unchanged: number },
  sampleCreates: MissionEventRecord[],
  sampleUpdates: { before: MissionEventRecord; after: MissionEventRecord }[],
  dryRun: boolean
) => {
  if (!batch.length) {
    return;
  }

  const ids = batch.map(({ record }) => record.id);
  const existingRecords = await prismaCore.missionEvent.findMany({ where: { id: { in: ids } } });
  const existingById = new Map(existingRecords.map((record) => [record.id, record]));

  for (const entry of batch) {
    const existing = existingById.get(entry.record.id);

    if (!existing) {
      stats.created += 1;
      if (dryRun) {
        if (sampleCreates.length < 5) {
          sampleCreates.push(entry.record);
        }
      } else {
        await prismaCore.missionEvent.create({ data: entry.create });
      }
      continue;
    }

    const existingRecord: MissionEventRecord = {
      id: existing.id,
      missionId: existing.missionId,
      type: existing.type,
      changes: (existing.changes ?? null) as Prisma.JsonValue | null,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: existing.updatedAt,
    };

    if (!hasDifferences(existingRecord, entry.record)) {
      stats.unchanged += 1;
      continue;
    }

    stats.updated += 1;
    if (dryRun) {
      if (sampleUpdates.length < 5) {
        sampleUpdates.push({ before: existingRecord, after: entry.record });
      }
    } else {
      await prismaCore.missionEvent.update({
        where: { id: entry.record.id },
        data: entry.update,
      });
    }
  }
};

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[${SCRIPT_NAME}] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("mission-events");
  const total = await collection.countDocuments();
  console.log(`[${SCRIPT_NAME}] Found ${total} mission event(s) in MongoDB`);

  if (total === 0) {
    console.log(`[${SCRIPT_NAME}] Nothing to migrate`);
    return;
  }

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0,
  };
  const sampleCreates: MissionEventRecord[] = [];
  const sampleUpdates: { before: MissionEventRecord; after: MissionEventRecord }[] = [];

  const buffer: NormalizedMissionEventData[] = [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoMissionEventDocument | null;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeMissionEvent(doc);
      buffer.push(normalized);
      stats.processed += 1;
    } catch (error) {
      stats.skipped += 1;
      console.error(`[${SCRIPT_NAME}] Failed to normalize mission event`, error);
    }

    if (buffer.length >= BATCH_SIZE) {
      await persistBatch(buffer.splice(0, buffer.length), prismaCore, stats, sampleCreates, sampleUpdates, Boolean(options.dryRun));
      console.log(
        `[${SCRIPT_NAME}] Progress: ${stats.processed}/${total} (created: ${stats.created}, updated: ${stats.updated}, unchanged: ${stats.unchanged}, skipped: ${stats.skipped})`
      );
    }
  }

  if (buffer.length > 0) {
    await persistBatch(buffer, prismaCore, stats, sampleCreates, sampleUpdates, Boolean(options.dryRun));
  }

  if (options.dryRun) {
    console.log(`[${SCRIPT_NAME}][Dry-run] Would create ${stats.created} event(s), update ${stats.updated}, keep ${stats.unchanged}, skipped ${stats.skipped}`);
    if (sampleCreates.length) {
      console.log(`[${SCRIPT_NAME}][Dry-run] Sample creations:`);
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log(`[${SCRIPT_NAME}][Dry-run] Sample updates:`);
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[${SCRIPT_NAME}] Created ${stats.created} event(s), updated ${stats.updated}, unchanged ${stats.unchanged}, skipped ${stats.skipped}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error(`[${SCRIPT_NAME}] Unexpected error:`, error);
    await cleanup();
    process.exit(1);
  }
};

run();
