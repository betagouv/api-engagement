import mongoose from "mongoose";

import type { Prisma } from "../../src/db/core";
import { asDate, asNumber, asString, toMongoObjectIdString } from "./utils/cast";
import { compareDates, compareNumbers, compareStrings } from "./utils/compare";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateWarningBots");
loadEnvironment(options, __dirname, "MigrateWarningBots");

type MongoWarningBotDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  hash?: unknown;
  userAgent?: unknown;
  printCount?: unknown;
  clickCount?: unknown;
  applyCount?: unknown;
  accountCount?: unknown;
  publisherId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type WarningBotRecord = {
  id: string;
  hash: string;
  userAgent: string;
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  publisherId: string;
  createdAt: Date;
  updatedAt: Date;
};

type NormalizedWarningBotData = {
  record: WarningBotRecord;
  create: Prisma.WarningBotUncheckedCreateInput;
  update: Prisma.WarningBotUncheckedUpdateInput;
};

const BATCH_SIZE = 100;

const extractWarningBotId = (doc: MongoWarningBotDocument): string => {
  const idFromString = asString(doc.id);
  if (idFromString) {
    return idFromString;
  }

  const idFromObjectId = toMongoObjectIdString(doc._id);
  if (idFromObjectId) {
    return idFromObjectId;
  }

  throw new Error("[MigrateWarningBots] Encountered warning bot document without a valid identifier");
};

const normalizeWarningBot = (doc: MongoWarningBotDocument): NormalizedWarningBotData => {
  const id = extractWarningBotId(doc);

  const hash = asString(doc.hash);
  if (!hash) {
    throw new Error(`[MigrateWarningBots] Warning bot ${id} does not have a valid hash`);
  }

  const publisherId = asString(doc.publisherId);
  if (!publisherId) {
    throw new Error(`[MigrateWarningBots] Warning bot ${id} does not have a valid publisherId`);
  }

  const userAgent = asString(doc.userAgent) ?? "";
  if (!userAgent) {
    console.warn(`[MigrateWarningBots] Warning bot ${id} missing userAgent, defaulting to empty string`);
  }

  const printCount = asNumber(doc.printCount, 0);
  const clickCount = asNumber(doc.clickCount, 0);
  const applyCount = asNumber(doc.applyCount, 0);
  const accountCount = asNumber(doc.accountCount, 0);

  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;

  const record: WarningBotRecord = {
    id,
    hash,
    userAgent,
    printCount,
    clickCount,
    applyCount,
    accountCount,
    publisherId,
    createdAt,
    updatedAt,
  };

  const create: Prisma.WarningBotUncheckedCreateInput = {
    id: record.id,
    hash: record.hash,
    userAgent: record.userAgent,
    printCount: record.printCount,
    clickCount: record.clickCount,
    applyCount: record.applyCount,
    accountCount: record.accountCount,
    publisherId: record.publisherId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.WarningBotUncheckedUpdateInput = {
    hash: record.hash,
    userAgent: record.userAgent,
    printCount: record.printCount,
    clickCount: record.clickCount,
    applyCount: record.applyCount,
    accountCount: record.accountCount,
    publisherId: record.publisherId,
    updatedAt: record.updatedAt,
  };

  return { record, create, update };
};

const hasDifferences = (existing: WarningBotRecord, target: WarningBotRecord): boolean => {
  if (!compareStrings(existing.hash, target.hash)) return true;
  if (!compareStrings(existing.userAgent, target.userAgent)) return true;
  if (!compareNumbers(existing.printCount, target.printCount)) return true;
  if (!compareNumbers(existing.clickCount, target.clickCount)) return true;
  if (!compareNumbers(existing.applyCount, target.applyCount)) return true;
  if (!compareNumbers(existing.accountCount, target.accountCount)) return true;
  if (!compareStrings(existing.publisherId, target.publisherId)) return true;
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

const formatRecordForLog = (record: WarningBotRecord) => ({
  id: record.id,
  hash: record.hash,
  userAgent: record.userAgent,
  printCount: record.printCount,
  clickCount: record.clickCount,
  applyCount: record.applyCount,
  accountCount: record.accountCount,
  publisherId: record.publisherId,
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
  console.log(`[MigrateWarningBots] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("warning-bots");
  const docs = (await collection.find({}).toArray()) as MongoWarningBotDocument[];
  console.log(`[MigrateWarningBots] Retrieved ${docs.length} warning bot document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateWarningBots] Nothing to migrate");
    return;
  }

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
      `[MigrateWarningBots] Found ${invalidPublisherIds.length} warning bot(s) with invalid publisherId(s): ${invalidPublisherIds.slice(0, 10).join(", ")}${invalidPublisherIds.length > 10 ? "..." : ""}`
    );
  }

  const normalized = docs
    .map((doc) => {
      try {
        const normalized = normalizeWarningBot(doc);
        if (!validPublisherIds.has(normalized.record.publisherId)) {
          return null;
        }
        return normalized;
      } catch (error) {
        console.error("[MigrateWarningBots] Failed to normalize warning bot document:", error);
        return null;
      }
    })
    .filter((item): item is NormalizedWarningBotData => item !== null);

  console.log(`[MigrateWarningBots] Normalized ${normalized.length} warning bot(s) (skipped ${docs.length - normalized.length} invalid)`);

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: WarningBotRecord[] = [];
  const sampleUpdates: { before: WarningBotRecord; after: WarningBotRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await prismaCore.warningBot.findMany({
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
          await prismaCore.warningBot.create({ data: entry.create });
        }
        continue;
      }

      const existingRecord: WarningBotRecord = {
        id: existing.id,
        hash: existing.hash,
        userAgent: existing.userAgent,
        printCount: existing.printCount,
        clickCount: existing.clickCount,
        applyCount: existing.applyCount,
        accountCount: existing.accountCount,
        publisherId: existing.publisherId,
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
        await prismaCore.warningBot.update({
          where: { id: entry.record.id },
          data: entry.update,
        });
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateWarningBots][Dry-run] Would create ${stats.created} warning bot(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateWarningBots][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateWarningBots][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateWarningBots] Created ${stats.created} warning bot(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateWarningBots] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
