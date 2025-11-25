import mongoose from "mongoose";

import type { Prisma } from "../../src/db/core";
import type { ImportRecord } from "../../src/types/import";
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

const BATCH_SIZE = 1000;

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

const normalizeImport = (doc: MongoImportDocument) => {
  const id = extractId(doc);
  const publisherId = extractPublisherId(doc.publisherId);

  const record: ImportRecord = {
    id,
    name: (doc.name ?? "").toString(),
    publisherId,
    missionCount: normalizeNumber(doc.missionCount) ?? 0,
    refusedCount: normalizeNumber(doc.refusedCount) ?? 0,
    createdCount: normalizeNumber(doc.createdCount) ?? 0,
    deletedCount: normalizeNumber(doc.deletedCount) ?? 0,
    updatedCount: normalizeNumber(doc.updatedCount) ?? 0,
    startedAt: normalizeDate(doc.startedAt) ?? null,
    finishedAt: normalizeDate(doc.endedAt) ?? null,
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
    finishedAt: record.finishedAt,
    status: record.status,
    error: record.error,
    failed: record.failed as Prisma.InputJsonValue,
  };

  return { record, create };
};

const formatRecordForLog = (record: ImportRecord) => ({
  id: record.id,
  name: record.name,
  publisherId: record.publisherId,
  startedAt: record.startedAt ? record.startedAt.toISOString() : null,
  finishedAt: record.finishedAt ? record.finishedAt.toISOString() : null,
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
  const [{ mongoConnected }, { pgConnected }, { importRepository }, { publisherRepository }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/import"),
    import("../../src/repositories/publisher"),
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
  let skippedExisting = 0;
  let skippedMissingPublisher = 0;
  let errors = 0;
  const missingPublishersLogged = new Set<string>();

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

    const publisherIds = Array.from(new Set(normalized.map(({ record }) => record.publisherId)));
    const existingPublisherIds = new Set(await publisherRepository.findExistingIds(publisherIds));
    const readyForInsert = normalized.filter(({ record }) => {
      if (!existingPublisherIds.has(record.publisherId)) {
        if (!missingPublishersLogged.has(record.publisherId)) {
          console.warn(`[MigrateImports] Missing publisher ${record.publisherId}, skipping associated imports`);
          missingPublishersLogged.add(record.publisherId);
        }
        skippedMissingPublisher++;
        return false;
      }
      return true;
    });

    const ids = readyForInsert.map(({ record }) => record.id);
    const existingIds = new Set(await importRepository.findExistingIds(ids));
    const toCreate = readyForInsert.filter(({ record }) => !existingIds.has(record.id));

    const alreadyExisting = readyForInsert.length - toCreate.length;
    skippedExisting += alreadyExisting;

    if (toCreate.length) {
      if (options.dryRun) {
        toCreate.forEach((entry) =>
          console.log(`[MigrateImports][Dry-run] Would create import ${entry.record.id} (${entry.record.name})`, JSON.stringify(formatRecordForLog(entry.record)))
        );
      } else {
        try {
          await importRepository.createMany({ data: toCreate.map((entry) => entry.create), skipDuplicates: true });
        } catch (error) {
          console.error("[MigrateImports] Failed to insert batch, falling back to individual inserts", error);
          for (const entry of toCreate) {
            try {
              await importRepository.create({ data: entry.create });
            } catch (innerError) {
              console.error("[MigrateImports] Failed to create import", entry.record.id, innerError);
              errors++;
            }
          }
        }
      }
      created += toCreate.length;
    }

    processed += normalized.length;

    console.log(
      `[MigrateImports] Progress ${processed}/${total} (created: ${created}, skippedExisting: ${skippedExisting}, skippedMissingPublisher: ${skippedMissingPublisher}, errors: ${errors})`
    );
  }

  console.log(
    `[MigrateImports] Completed. Processed: ${processed}, created: ${created}, skippedExisting: ${skippedExisting}, skippedMissingPublisher: ${skippedMissingPublisher}, errors: ${errors}`
  );
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
