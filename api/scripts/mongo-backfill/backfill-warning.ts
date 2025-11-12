import mongoose from "mongoose";

import type { Prisma } from "../../src/db/core";
import { asBoolean, asDate, asNumber, asString } from "./utils/cast";
import { compareBooleans, compareDates, compareNumbers, compareStrings } from "./utils/compare";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateAlerts");
loadEnvironment(options, __dirname, "MigrateAlerts");

type MongoWarningDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  type?: unknown;
  title?: unknown;
  description?: unknown;
  publisherId?: unknown;
  publisherName?: unknown;
  publisherLogo?: unknown;
  seen?: unknown;
  fixed?: unknown;
  fixedAt?: unknown;
  occurrences?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type WarningRecord = {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  publisherId: string;
  seen: boolean;
  fixed: boolean;
  fixedAt: Date | null;
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
};

type NormalizedWarningData = {
  record: WarningRecord;
  create: Prisma.WarningUncheckedCreateInput;
  update: Prisma.WarningUncheckedUpdateInput;
};

const BATCH_SIZE = 100;

const toMongoObjectIdString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (mongoose.isValidObjectId(value)) {
    if (typeof value === "string") {
      return value;
    }
    if (typeof (value as { toHexString?: () => string }).toHexString === "function") {
      return (value as { toHexString: () => string }).toHexString();
    }
    if (typeof (value as { toString?: () => string }).toString === "function") {
      return (value as { toString: () => string }).toString();
    }
  }

  if (typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
};

const extractAlertId = (doc: MongoWarningDocument): string => {
  const idFromString = asString(doc.id);
  if (idFromString) {
    return idFromString;
  }

  const idFromObjectId = toMongoObjectIdString(doc._id);
  if (idFromObjectId) {
    return idFromObjectId;
  }

  throw new Error("[MigrateAlerts] Encountered alert document without a valid identifier");
};

const normalizeAlert = (doc: MongoWarningDocument): NormalizedWarningData => {
  const id = extractAlertId(doc);
  const type = asString(doc.type);
  if (!type) {
    throw new Error(`[MigrateAlerts] Alert ${id} does not have a valid type`);
  }

  const publisherId = asString(doc.publisherId);
  if (!publisherId) {
    throw new Error(`[MigrateAlerts] Alert ${id} does not have a valid publisherId`);
  }

  const title = asString(doc.title);
  const description = asString(doc.description);
  const seen = asBoolean(doc.seen, false);
  const fixed = asBoolean(doc.fixed, false);
  const fixedAt = asDate(doc.fixedAt);
  const occurrences = asNumber(doc.occurrences, 1);
  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;

  const record: WarningRecord = {
    id,
    type,
    title,
    description,
    publisherId,
    seen,
    fixed,
    fixedAt,
    occurrences,
    createdAt,
    updatedAt,
  };

  const create: Prisma.WarningUncheckedCreateInput = {
    id: record.id,
    type: record.type,
    title: record.title,
    description: record.description,
    publisherId: record.publisherId,
    seen: record.seen,
    fixed: record.fixed,
    fixedAt: record.fixedAt,
    occurrences: record.occurrences,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.WarningUncheckedUpdateInput = {
    type: record.type,
    title: record.title,
    description: record.description,
    publisherId: record.publisherId,
    seen: record.seen,
    fixed: record.fixed,
    fixedAt: record.fixedAt,
    occurrences: record.occurrences,
    updatedAt: record.updatedAt,
  };

  return { record, create, update };
};

const hasDifferences = (existing: WarningRecord, target: WarningRecord): boolean => {
  if (!compareStrings(existing.type, target.type)) return true;
  if (!compareStrings(existing.title, target.title)) return true;
  if (!compareStrings(existing.description, target.description)) return true;
  if (!compareStrings(existing.publisherId, target.publisherId)) return true;
  if (!compareBooleans(existing.seen, target.seen)) return true;
  if (!compareBooleans(existing.fixed, target.fixed)) return true;
  if (!compareDates(existing.fixedAt, target.fixedAt)) return true;
  if (!compareNumbers(existing.occurrences, target.occurrences)) return true;
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

const formatRecordForLog = (record: WarningRecord) => ({
  id: record.id,
  type: record.type,
  title: record.title,
  description: record.description,
  publisherId: record.publisherId,
  seen: record.seen,
  fixed: record.fixed,
  fixedAt: record.fixedAt ? record.fixedAt.toISOString() : null,
  occurrences: record.occurrences,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[MigrateAlerts] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("warnings");
  const docs = (await collection.find({}).toArray()) as MongoWarningDocument[];
  console.log(`[MigrateAlerts] Retrieved ${docs.length} alert document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateAlerts] Nothing to migrate");
    return;
  }

  // Validate publisherIds exist before processing
  const publisherIds = new Set<string>();
  for (const doc of docs) {
    const publisherId = asString(doc.publisherId);
    if (publisherId) {
      publisherIds.add(publisherId);
    }
  }

  const existingPublishers = await prismaCore.publisher.findMany({
    where: { id: { in: Array.from(publisherIds) } },
    select: { id: true },
  });
  const validPublisherIds = new Set(existingPublishers.map((p) => p.id));
  const invalidPublisherIds = Array.from(publisherIds).filter((id) => !validPublisherIds.has(id));

  if (invalidPublisherIds.length > 0) {
    console.warn(
      `[MigrateAlerts] Found ${invalidPublisherIds.length} alert(s) with invalid publisherId(s): ${invalidPublisherIds.slice(0, 10).join(", ")}${invalidPublisherIds.length > 10 ? "..." : ""}`
    );
  }

  const normalized = docs
    .map((doc) => {
      try {
        const normalized = normalizeAlert(doc);
        // Skip alerts with invalid publisherIds
        if (!validPublisherIds.has(normalized.record.publisherId)) {
          return null;
        }
        return normalized;
      } catch (error) {
        console.error(`[MigrateAlerts] Failed to normalize alert document:`, error);
        return null;
      }
    })
    .filter((item): item is NormalizedWarningData => item !== null);

  console.log(`[MigrateAlerts] Normalized ${normalized.length} alert(s) (skipped ${docs.length - normalized.length} invalid)`);

  const stats = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  const sampleCreates: WarningRecord[] = [];
  const sampleUpdates: { before: WarningRecord; after: WarningRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await prismaCore.warning.findMany({
      where: { id: { in: chunkIds } },
    });
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
          await prismaCore.warning.create({ data: entry.create });
        }
        continue;
      }

      const existingRecord: WarningRecord = {
        id: existing.id,
        type: existing.type,
        title: existing.title,
        description: existing.description,
        publisherId: existing.publisherId,
        seen: existing.seen,
        fixed: existing.fixed,
        fixedAt: existing.fixedAt,
        occurrences: existing.occurrences,
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
        await prismaCore.warning.update({
          where: { id: entry.record.id },
          data: entry.update,
        });
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateAlerts][Dry-run] Would create ${stats.created} alert(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateAlerts][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateAlerts][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateAlerts] Created ${stats.created} alert(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateAlerts] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
