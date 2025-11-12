import dotenv from "dotenv";

type ScriptOptions = {
  dryRun: boolean;
  envPath?: string;
};

const LOG_PREFIX = "[BackfillModerationEvents]";

const parseOptions = (argv: string[]): ScriptOptions => {
  const args = [...argv];
  const options: ScriptOptions = { dryRun: false };

  const envIndex = args.indexOf("--env");
  if (envIndex !== -1) {
    const envPath = args[envIndex + 1];
    if (envPath) {
      options.envPath = envPath;
      args.splice(envIndex, 2);
    } else {
      console.warn(`${LOG_PREFIX} Flag --env provided without a value, defaulting to .env`);
      args.splice(envIndex, 1);
    }
  }

  const dryRunIndex = args.indexOf("--dry-run");
  if (dryRunIndex !== -1) {
    options.dryRun = true;
    args.splice(dryRunIndex, 1);
  }

  if (args.length) {
    console.warn(`${LOG_PREFIX} Ignoring unexpected arguments: ${args.join(", ")}`);
  }

  return options;
};

const options = parseOptions(process.argv.slice(2));

if (options.envPath) {
  console.log(`${LOG_PREFIX} Loading environment from ${options.envPath}`);
  dotenv.config({ path: options.envPath });
} else {
  dotenv.config();
}

import mongoose from "mongoose";

import type { Prisma, ModerationEvent as PrismaModerationEvent } from "../../src/db/core";
import { mongoConnected } from "../../src/db/mongo";
import { pgConnected, prismaCore } from "../../src/db/postgres";
import { moderationEventRepository } from "../../src/repositories/moderation-event";
import type { ModerationEventRecord, ModerationEventStatus } from "../../src/types/moderation-event";

type MongoModerationEventDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  missionId?: { toString(): string } | string | null;
  moderatorId?: { toString(): string } | string | null;
  userId?: { toString(): string } | string | null;
  userName?: string | null;
  initialStatus?: string | null;
  newStatus?: string | null;
  initialComment?: string | null;
  newComment?: string | null;
  initialNote?: string | null;
  newNote?: string | null;
  initialTitle?: string | null;
  newTitle?: string | null;
  initialSiren?: string | null;
  newSiren?: string | null;
  initialRNA?: string | null;
  newRNA?: string | null;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
};

type NormalizedModerationEventData = {
  record: ModerationEventRecord;
  create: Prisma.ModerationEventCreateInput;
  update: Prisma.ModerationEventUpdateInput;
};

const BATCH_SIZE = 100;
const allowedStatuses: ModerationEventStatus[] = ["ACCEPTED", "REFUSED", "PENDING", "ONGOING"];

const normalizeDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const toOptionalString = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof (value as { toString?: () => string }).toString === "function") {
    const str = (value as { toString: () => string }).toString().trim();
    return str.length ? str : null;
  }
  return null;
};

const requireString = (value: unknown, context: string): string => {
  const str = toOptionalString(value);
  if (!str) {
    throw new Error(`${LOG_PREFIX} Missing required string for ${context}`);
  }
  return str;
};

const normalizeStatus = (value: unknown, context: string): ModerationEventStatus | null => {
  const status = toOptionalString(value);
  if (!status) {
    return null;
  }

  const normalized = status.toUpperCase();
  if (allowedStatuses.includes(normalized as ModerationEventStatus)) {
    return normalized as ModerationEventStatus;
  }

  console.warn(`${LOG_PREFIX} Unknown status "${status}" for ${context}, defaulting to null`);
  return null;
};

const normalizeModerationEvent = (doc: MongoModerationEventDocument): NormalizedModerationEventData => {
  const id = requireString(doc.id ?? doc._id, "ModerationEvent._id");
  const missionId = requireString(doc.missionId, `ModerationEvent(${id}).missionId`);
  const moderatorId = requireString(doc.moderatorId, `ModerationEvent(${id}).moderatorId`);

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;

  const record: ModerationEventRecord = {
    id,
    missionId,
    moderatorId,
    userId: toOptionalString(doc.userId),
    userName: toOptionalString(doc.userName),
    initialStatus: normalizeStatus(doc.initialStatus, `ModerationEvent(${id}).initialStatus`),
    newStatus: normalizeStatus(doc.newStatus, `ModerationEvent(${id}).newStatus`),
    initialComment: toOptionalString(doc.initialComment),
    newComment: toOptionalString(doc.newComment),
    initialNote: toOptionalString(doc.initialNote),
    newNote: toOptionalString(doc.newNote),
    initialTitle: toOptionalString(doc.initialTitle),
    newTitle: toOptionalString(doc.newTitle),
    initialSiren: toOptionalString(doc.initialSiren),
    newSiren: toOptionalString(doc.newSiren),
    initialRNA: toOptionalString(doc.initialRNA),
    newRNA: toOptionalString(doc.newRNA),
    createdAt,
    updatedAt,
  };

  const create: Prisma.ModerationEventCreateInput = {
    id: record.id,
    missionId: record.missionId,
    moderatorId: record.moderatorId,
    userId: record.userId,
    userName: record.userName,
    initialStatus: record.initialStatus,
    newStatus: record.newStatus,
    initialComment: record.initialComment,
    newComment: record.newComment,
    initialNote: record.initialNote,
    newNote: record.newNote,
    initialTitle: record.initialTitle,
    newTitle: record.newTitle,
    initialSiren: record.initialSiren,
    newSiren: record.newSiren,
    initialRNA: record.initialRNA,
    newRNA: record.newRNA,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.ModerationEventUpdateInput = {
    missionId: record.missionId,
    moderatorId: record.moderatorId,
    userId: record.userId,
    userName: record.userName,
    initialStatus: record.initialStatus,
    newStatus: record.newStatus,
    initialComment: record.initialComment,
    newComment: record.newComment,
    initialNote: record.initialNote,
    newNote: record.newNote,
    initialTitle: record.initialTitle,
    newTitle: record.newTitle,
    initialSiren: record.initialSiren,
    newSiren: record.newSiren,
    initialRNA: record.initialRNA,
    newRNA: record.newRNA,
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

const toRecordFromPrisma = (event: PrismaModerationEvent): ModerationEventRecord => ({
  id: event.id,
  missionId: event.missionId,
  moderatorId: event.moderatorId,
  userId: event.userId,
  userName: event.userName,
  initialStatus: event.initialStatus,
  newStatus: event.newStatus,
  initialComment: event.initialComment,
  newComment: event.newComment,
  initialNote: event.initialNote,
  newNote: event.newNote,
  initialTitle: event.initialTitle,
  newTitle: event.newTitle,
  initialSiren: event.initialSiren,
  newSiren: event.newSiren,
  initialRNA: event.initialRNA,
  newRNA: event.newRNA,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});

const formatRecordForLog = (record: ModerationEventRecord) => ({
  id: record.id,
  missionId: record.missionId,
  moderatorId: record.moderatorId,
  initialStatus: record.initialStatus,
  newStatus: record.newStatus,
  userId: record.userId,
  userName: record.userName,
  hasComment: Boolean(record.initialComment ?? record.newComment),
  hasNote: Boolean(record.initialNote ?? record.newNote),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const compareString = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);
const compareStatus = (a: ModerationEventStatus | null, b: ModerationEventStatus | null) => (a ?? null) === (b ?? null);

const hasDifferences = (existing: PrismaModerationEvent, target: ModerationEventRecord): boolean => {
  if (existing.missionId !== target.missionId) return true;
  if (existing.moderatorId !== target.moderatorId) return true;
  if (!compareString(existing.userId, target.userId)) return true;
  if (!compareString(existing.userName, target.userName)) return true;
  if (!compareStatus(existing.initialStatus, target.initialStatus)) return true;
  if (!compareStatus(existing.newStatus, target.newStatus)) return true;
  if (!compareString(existing.initialComment, target.initialComment)) return true;
  if (!compareString(existing.newComment, target.newComment)) return true;
  if (!compareString(existing.initialNote, target.initialNote)) return true;
  if (!compareString(existing.newNote, target.newNote)) return true;
  if (!compareString(existing.initialTitle, target.initialTitle)) return true;
  if (!compareString(existing.newTitle, target.newTitle)) return true;
  if (!compareString(existing.initialSiren, target.initialSiren)) return true;
  if (!compareString(existing.newSiren, target.newSiren)) return true;
  if (!compareString(existing.initialRNA, target.initialRNA)) return true;
  if (!compareString(existing.newRNA, target.newRNA)) return true;
  if (existing.createdAt.getTime() !== target.createdAt.getTime()) return true;
  return false;
};

const cleanup = async () => {
  await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
};

const main = async () => {
  console.log(`${LOG_PREFIX} Starting${options.dryRun ? " (dry-run)" : ""}`);
  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("moderation-events");
  const docs = (await collection.find({}).toArray()) as MongoModerationEventDocument[];
  console.log(`${LOG_PREFIX} Retrieved ${docs.length} moderation event(s) from MongoDB`);

  if (docs.length === 0) {
    console.log(`${LOG_PREFIX} Nothing to migrate`);
    return;
  }

  const normalized: NormalizedModerationEventData[] = [];
  let skipped = 0;
  for (const doc of docs) {
    try {
      normalized.push(normalizeModerationEvent(doc));
    } catch (error) {
      skipped += 1;
      console.warn(`${LOG_PREFIX} Skipping document because of an error:`, error);
    }
  }

  if (skipped) {
    console.warn(`${LOG_PREFIX} Skipped ${skipped} document(s) due to validation issues`);
  }

  if (!normalized.length) {
    console.log(`${LOG_PREFIX} No valid moderation event to process`);
    return;
  }

  const stats = { created: 0, updated: 0, unchanged: 0, skipped };
  const sampleCreates: ModerationEventRecord[] = [];
  const sampleUpdates: { before: ModerationEventRecord; after: ModerationEventRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await moderationEventRepository.find({ where: { id: { in: chunkIds } } });
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
          await moderationEventRepository.create(entry.create);
        }
        continue;
      }

      if (!hasDifferences(existing, entry.record)) {
        stats.unchanged += 1;
        continue;
      }

      stats.updated += 1;
      if (options.dryRun) {
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({ before: toRecordFromPrisma(existing), after: entry.record });
        }
      } else {
        await moderationEventRepository.update(existing.id, entry.update);
      }
    }
  }

  if (options.dryRun) {
    console.log(`${LOG_PREFIX}[Dry-run] Would create ${stats.created} event(s), update ${stats.updated}, leave ${stats.unchanged} unchanged, skipped ${stats.skipped}`);
    if (sampleCreates.length) {
      console.log(`${LOG_PREFIX}[Dry-run] Sample creations:`);
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log(`${LOG_PREFIX}[Dry-run] Sample updates:`);
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`${LOG_PREFIX} Created ${stats.created} event(s), updated ${stats.updated}, unchanged ${stats.unchanged}, skipped ${stats.skipped}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error);
    await cleanup();
    process.exit(1);
  }
};

run();
