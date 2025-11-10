import mongoose from "mongoose";

import type { Prisma, Import as PrismaImport } from "../../src/db/core";
import type { ImportRecord } from "../../src/types/import";
import { compareDates, compareJsons, compareNumbers, compareStrings } from "./utils/compare";
import { normalizeDate, normalizeNumber, toJsonValue } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateImports");
loadEnvironment(options, __dirname, "MigrateImports");

type MongoImportDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  name?: string;
  publisherId?: { toString(): string } | string;
  missionCount?: number | string | null;
  refusedCount?: number | string | null;
  createdCount?: number | string | null;
  deletedCount?: number | string | null;
  updatedCount?: number | string | null;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  status?: string | null;
  error?: string | null;
  failed?: unknown;
};

const BATCH_SIZE = 100;

const normalizeStatus = (value: string | null | undefined): "SUCCESS" | "FAILED" => {
  const normalized = (value ?? "SUCCESS").toUpperCase().trim();
  return normalized === "FAILED" ? "FAILED" : "SUCCESS";
};

const extractId = (doc: MongoImportDocument): string => {
  if (typeof doc.id === "string" && doc.id.trim()) {
    return doc.id.trim();
  }
  if (doc._id && typeof (doc._id as any).toString === "function") {
    return (doc._id as any).toString();
  }
  throw new Error("[MigrateImports] Encountered an import document without an identifier");
};

const extractPublisherId = (value: MongoImportDocument["publisherId"]): string => {
  if (!value) {
    throw new Error("[MigrateImports] Encountered an import document without publisherId");
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value.toString === "function") {
    return value.toString();
  }
  throw new Error("[MigrateImports] Invalid publisherId type");
};

const toRecord = (value: PrismaImport): ImportRecord => ({
  _id: value.id,
  id: value.id,
  name: value.name,
  publisherId: value.publisherId,
  missionCount: value.missionCount,
  refusedCount: value.refusedCount,
  createdCount: value.createdCount,
  deletedCount: value.deletedCount,
  updatedCount: value.updatedCount,
  startedAt: value.startedAt ?? null,
  endedAt: value.finishedAt ?? null,
  status: value.status,
  error: value.error ?? null,
  failed: value.failed ?? [],
});

const hasDifferences = (existing: ImportRecord, target: ImportRecord): boolean => {
  if (!compareStrings(existing.name, target.name)) return true;
  if (!compareStrings(existing.publisherId, target.publisherId)) return true;
  if (!compareNumbers(existing.missionCount, target.missionCount)) return true;
  if (!compareNumbers(existing.refusedCount, target.refusedCount)) return true;
  if (!compareNumbers(existing.createdCount, target.createdCount)) return true;
  if (!compareNumbers(existing.deletedCount, target.deletedCount)) return true;
  if (!compareNumbers(existing.updatedCount, target.updatedCount)) return true;
  if (!compareDates(existing.startedAt, target.startedAt)) return true;
  if (!compareDates(existing.endedAt, target.endedAt)) return true;
  if (existing.status !== target.status) return true;
  if (!compareStrings(existing.error, target.error)) return true;
  if (!compareJsons(existing.failed, target.failed)) return true;
  return false;
};

const normalizeImport = (doc: MongoImportDocument) => {
  const id = extractId(doc);
  const publisherId = extractPublisherId(doc.publisherId);

  const record: ImportRecord = {
    _id: id,
    id,
    name: (doc.name ?? "").toString(),
    publisherId,
    missionCount: normalizeNumber(doc.missionCount) ?? 0,
    refusedCount: normalizeNumber(doc.refusedCount) ?? 0,
    createdCount: normalizeNumber(doc.createdCount) ?? 0,
    deletedCount: normalizeNumber(doc.deletedCount) ?? 0,
    updatedCount: normalizeNumber(doc.updatedCount) ?? 0,
    startedAt: normalizeDate(doc.startedAt) ?? null,
    endedAt: normalizeDate(doc.endedAt) ?? null,
    status: normalizeStatus(doc.status ?? undefined),
    error: doc.error ?? null,
    failed: toJsonValue(doc.failed),
  };

  const create: Prisma.ImportUncheckedCreateInput = {
    id: record.id,
    name: record.name,
    publisherId: record.publisherId,
    missionCount: record.missionCount,
    refusedCount: record.refusedCount,
    createdCount: record.createdCount,
    deletedCount: record.deletedCount,
    updatedCount: record.updatedCount,
    startedAt: record.startedAt,
    finishedAt: record.endedAt,
    status: record.status,
    error: record.error,
    failed: record.failed as Prisma.InputJsonValue,
  };

  const update: Prisma.ImportUpdateInput = {
    name: record.name,
    missionCount: record.missionCount,
    refusedCount: record.refusedCount,
    createdCount: record.createdCount,
    deletedCount: record.deletedCount,
    updatedCount: record.updatedCount,
    startedAt: record.startedAt,
    finishedAt: record.endedAt,
    status: record.status,
    error: record.error,
    failed: record.failed as Prisma.InputJsonValue,
  };

  return { record, create, update };
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const formatRecordForLog = (record: ImportRecord) => ({
  id: record.id,
  name: record.name,
  publisherId: record.publisherId,
  startedAt: record.startedAt ? record.startedAt.toISOString() : null,
  endedAt: record.endedAt ? record.endedAt.toISOString() : null,
  status: record.status,
  counts: {
    created: record.createdCount,
    updated: record.updatedCount,
    deleted: record.deletedCount,
    refused: record.refusedCount,
    mission: record.missionCount,
  },
});

const migrateImports = async () => {
  const [{ mongoConnected }, { pgConnected }, { importRepository }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/import"),
  ]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateImports] Starting migration");

  const collection = mongoose.connection.collection("imports");
  const total = await collection.countDocuments();
  console.log(`[MigrateImports] Found ${total} import document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const docs: MongoImportDocument[] = [];
    for (let i = 0; i < BATCH_SIZE && (await cursor.hasNext()); i++) {
      const doc = (await cursor.next()) as MongoImportDocument | null;
      if (doc) docs.push(doc);
    }
    if (docs.length === 0) {
      break;
    }

    const normalized = docs.map((doc) => normalizeImport(doc));
    const ids = normalized.map(({ record }) => record.id);
    const existing = await importRepository.findMany({ where: { id: { in: ids } } });
    const existingById = new Map(existing.map((e) => [e.id, toRecord(e)]));

    for (const entry of normalized) {
      try {
        const existingRecord = existingById.get(entry.record.id);
        if (!existingRecord) {
          if (options.dryRun) {
            console.log(`[MigrateImports][Dry-run] Would create import ${entry.record.id} (${entry.record.name})`, JSON.stringify(formatRecordForLog(entry.record)));
          } else {
            await importRepository.create({ data: entry.create });
          }
          created++;
        } else {
          if (hasDifferences(existingRecord, entry.record)) {
            if (options.dryRun) {
              console.log(`[MigrateImports][Dry-run] Would update import ${entry.record.id} (${entry.record.name})`, JSON.stringify(formatRecordForLog(entry.record)));
            } else {
              await importRepository.update({ where: { id: entry.record.id }, data: entry.update });
            }
            updated++;
          } else {
            unchanged++;
          }
        }
        processed++;
      } catch (error) {
        console.error("[MigrateImports] Failed to process import document", error);
        errors++;
      }
    }

    console.log(`[MigrateImports] Progress ${processed}/${total} (created: ${created}, updated: ${updated}, unchanged: ${unchanged}, errors: ${errors})`);
  }

  console.log(`[MigrateImports] Completed. Processed: ${processed}, created: ${created}, updated: ${updated}, unchanged: ${unchanged}, errors: ${errors}`);
};

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const run = async () => {
  try {
    await migrateImports();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateImports] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
