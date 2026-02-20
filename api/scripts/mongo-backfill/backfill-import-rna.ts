import mongoose from "mongoose";

import type { Prisma } from "@/db/core";
import type { ImportRnaRecord, ImportRnaStatus } from "@/types/import-rna";
import { asDate, asNumber, asString, toMongoObjectIdString } from "./utils/cast";
import { compareDates, compareNumbers, compareStrings } from "./utils/compare";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

type MongoImportRnaDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  year?: unknown;
  month?: unknown;
  resourceId?: unknown;
  resourceCreatedAt?: unknown;
  resourceUrl?: unknown;
  count?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type NormalizedImportRnaData = {
  record: ImportRnaRecord;
  create: Prisma.ImportRnaCreateInput;
  update: Prisma.ImportRnaUpdateInput;
};

const COLLECTION_NAME = "import-rnas";
const BATCH_SIZE = 100;

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateImportRna");
loadEnvironment(options, __dirname, "MigrateImportRna");

const normalizeStatus = (value: unknown): ImportRnaStatus | null => {
  const str = asString(value);
  if (!str) {
    return null;
  }

  const normalized = str.toUpperCase();
  const allowed: ImportRnaStatus[] = ["SUCCESS", "FAILED", "ALREADY_UPDATED"];
  return allowed.includes(normalized as ImportRnaStatus) ? (normalized as ImportRnaStatus) : null;
};

const extractId = (doc: MongoImportRnaDocument): string => {
  const idFromDoc = asString(doc.id);
  if (idFromDoc) {
    return idFromDoc;
  }

  const idFromObjectId = toMongoObjectIdString(doc._id);
  if (idFromObjectId) {
    return idFromObjectId;
  }

  throw new Error("[MigrateImportRna] Encountered an import-rna document without a valid identifier");
};

const normalizeImportRna = (doc: MongoImportRnaDocument): NormalizedImportRnaData => {
  const id = extractId(doc);

  const year = asNumber(doc.year, NaN);
  const month = asNumber(doc.month, NaN);
  const resourceId = asString(doc.resourceId);
  const resourceCreatedAt = asDate(doc.resourceCreatedAt);
  const resourceUrl = asString(doc.resourceUrl);
  const count = asNumber(doc.count, 0);
  const startedAt = asDate(doc.startedAt);
  const endedAt = asDate(doc.endedAt);
  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;
  const status = normalizeStatus(doc.status);

  if (!startedAt || !endedAt) {
    throw new Error(`[MigrateImportRna] ImportRna ${id} does not have valid start/end dates`);
  }

  const record: ImportRnaRecord = {
    id,
    year: Number.isFinite(year) ? year : null,
    month: Number.isFinite(month) ? month : null,
    resourceId: resourceId ?? null,
    resourceCreatedAt,
    resourceUrl: resourceUrl ?? null,
    count,
    startedAt,
    endedAt,
    status,
    createdAt,
    updatedAt,
  };

  const create: Prisma.ImportRnaCreateInput = {
    id: record.id,
    year: record.year,
    month: record.month,
    resourceId: record.resourceId,
    resourceCreatedAt: record.resourceCreatedAt,
    resourceUrl: record.resourceUrl,
    count: record.count,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.ImportRnaUpdateInput = {
    year: record.year,
    month: record.month,
    resourceId: record.resourceId,
    resourceCreatedAt: record.resourceCreatedAt,
    resourceUrl: record.resourceUrl,
    count: record.count,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    status: record.status,
    updatedAt: record.updatedAt,
  };

  return { record, create, update };
};

const hasDifferences = (existing: ImportRnaRecord, target: ImportRnaRecord): boolean => {
  if (!compareNumbers(existing.year, target.year)) return true;
  if (!compareNumbers(existing.month, target.month)) return true;
  if (!compareStrings(existing.resourceId, target.resourceId)) return true;
  if (!compareDates(existing.resourceCreatedAt, target.resourceCreatedAt)) return true;
  if (!compareStrings(existing.resourceUrl, target.resourceUrl)) return true;
  if (!compareNumbers(existing.count, target.count)) return true;
  if (!compareDates(existing.startedAt, target.startedAt)) return true;
  if (!compareDates(existing.endedAt, target.endedAt)) return true;
  if (!compareStrings(existing.status, target.status)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  if (!compareDates(existing.updatedAt, target.updatedAt)) return true;
  return false;
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const formatRecordForLog = (record: ImportRnaRecord) => ({
  id: record.id,
  year: record.year,
  month: record.month,
  resourceId: record.resourceId,
  resourceCreatedAt: record.resourceCreatedAt ? record.resourceCreatedAt.toISOString() : null,
  resourceUrl: record.resourceUrl,
  count: record.count,
  startedAt: record.startedAt.toISOString(),
  endedAt: record.endedAt.toISOString(),
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const cleanup = async () => {
  try {
    const { prismaCore } = await import("@/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[MigrateImportRna] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("@/db/mongo"), import("@/db/postgres")]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection(COLLECTION_NAME);
  const docs = (await collection.find({}).toArray()) as MongoImportRnaDocument[];
  console.log(`[MigrateImportRna] Retrieved ${docs.length} import-rna document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateImportRna] Nothing to migrate");
    return;
  }

  const normalized = docs
    .map((doc) => {
      try {
        return normalizeImportRna(doc);
      } catch (error) {
        console.error("[MigrateImportRna] Failed to normalize document:", error);
        return null;
      }
    })
    .filter((entry): entry is NormalizedImportRnaData => entry !== null);

  console.log(`[MigrateImportRna] Normalized ${normalized.length} import-rna document(s) (skipped ${docs.length - normalized.length} invalid)`);

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: ImportRnaRecord[] = [];
  const sampleUpdates: { before: ImportRnaRecord; after: ImportRnaRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const ids = chunk.map(({ record }) => record.id);
    const existingRecords = await prismaCore.importRna.findMany({ where: { id: { in: ids } } });
    const existingById = new Map(existingRecords.map((record) => [record.id, record]));

    for (const entry of chunk) {
      const existing = existingById.get(entry.record.id);

      if (!existing) {
        stats.created += 1;
        if (options.dryRun) {
          if (sampleCreates.length < 5) {
            sampleCreates.push(entry.record);
          }
        } else {
          await prismaCore.importRna.create({ data: entry.create });
        }
        continue;
      }

      const existingRecord: ImportRnaRecord = {
        id: existing.id,
        year: existing.year ?? null,
        month: existing.month ?? null,
        resourceId: existing.resourceId ?? null,
        resourceCreatedAt: existing.resourceCreatedAt ?? null,
        resourceUrl: existing.resourceUrl ?? null,
        count: existing.count,
        startedAt: existing.startedAt,
        endedAt: existing.endedAt,
        status: existing.status ?? null,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };

      if (!hasDifferences(existingRecord, entry.record)) {
        stats.unchanged += 1;
        continue;
      }

      stats.updated += 1;
      if (options.dryRun) {
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({ before: existingRecord, after: entry.record });
        }
      } else {
        await prismaCore.importRna.update({ where: { id: entry.record.id }, data: entry.update });
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateImportRna][Dry-run] Would create ${stats.created} import-rna(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateImportRna][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateImportRna][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateImportRna] Created ${stats.created} import-rna(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateImportRna] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
