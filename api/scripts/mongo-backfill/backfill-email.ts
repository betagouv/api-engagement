import dotenv from "dotenv";

import type { EmailStatus } from "../../src/db/core";

type ScriptOptions = {
  dryRun: boolean;
  envPath?: string;
};

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
      console.warn("[MigrateEmails] Flag --env provided without a value, defaulting to .env");
      args.splice(envIndex, 1);
    }
  }

  const dryRunIndex = args.indexOf("--dry-run");
  if (dryRunIndex !== -1) {
    options.dryRun = true;
    args.splice(dryRunIndex, 1);
  }

  if (args.length) {
    console.warn(`[MigrateEmails] Ignoring unexpected arguments: ${args.join(", ")}`);
  }

  return options;
};

const options = parseOptions(process.argv.slice(2));

if (options.envPath) {
  console.log(`[MigrateEmails] Loading environment from ${options.envPath}`);
  dotenv.config({ path: options.envPath });
} else {
  dotenv.config();
}

import mongoose from "mongoose";

import type { Prisma } from "../../src/db/core";
import { mongoConnected } from "../../src/db/mongo";
import { pgConnected, prismaCore } from "../../src/db/postgres";
import { emailRepository } from "../../src/repositories/email";
import type { EmailRecord } from "../../src/types/email";

type MongoEmailDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  messageId?: string | null;
  inReplyTo?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  to?: unknown;
  toEmails?: unknown;
  subject?: string | null;
  sentAt?: Date | string | null;
  rawTextBody?: string | null;
  rawHtmlBody?: string | null;
  mdTextBody?: string | null;
  attachments?: unknown;
  raw?: unknown;
  status?: string | null;
  reportUrl?: string | null;
  fileObjectName?: string | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  createdCount?: number | string | null;
  failed?: unknown;
  deletedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type NormalizedEmailData = {
  record: EmailRecord;
  create: Prisma.EmailCreateInput;
  update: Prisma.EmailUpdateInput;
};

const BATCH_SIZE = 100;

const normalizeDate = (value: Date | string | null | undefined): Date | null => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeNumber = (value: number | string | null | undefined): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | null => {
  if (value == null) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("[MigrateEmails] Unable to serialize JSON value, defaulting to null:", error);
    return null;
  }
};

const normalizeStatus = (value: string | null | undefined): EmailStatus => {
  const allowed: EmailStatus[] = ["PENDING", "PROCESSED", "DUPLICATE", "FAILED"];
  const normalized = (value ?? "PENDING").toUpperCase();
  return allowed.includes(normalized as EmailStatus) ? (normalized as EmailStatus) : "PENDING";
};

const uniqueSortedEmails = (emails: Iterable<string>): string[] => {
  const set = new Set<string>();
  const arr = Array.isArray(emails) ? emails : Array.from(emails);
  for (let i = 0; i < arr.length; i++) {
    const email = arr[i];
    const trimmed = typeof email === "string" ? email.trim() : "";
    if (trimmed) {
      set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

const extractToEmails = (doc: MongoEmailDocument): string[] => {
  const collected: string[] = [];

  if (Array.isArray(doc.toEmails)) {
    for (const value of doc.toEmails) {
      if (typeof value === "string") {
        collected.push(value);
      }
    }
  }

  if (Array.isArray(doc.to)) {
    for (const entry of doc.to) {
      if (typeof entry === "string") {
        collected.push(entry);
      } else if (entry && typeof (entry as any).email === "string") {
        collected.push((entry as any).email);
      }
    }
  }

  return uniqueSortedEmails(collected);
};

const stringifyJson = (value: unknown): string => {
  const sorter = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => sorter(item));
    }
    if (input && typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      const result: Record<string, unknown> = {};
      for (const [key, val] of entries) {
        result[key] = sorter(val);
      }
      return result;
    }
    return input;
  };

  return JSON.stringify(sorter(value));
};

const hasDifferences = (existing: EmailRecord, target: EmailRecord): boolean => {
  const compareString = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);
  const compareNumber = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);
  const compareDate = (a: Date | null, b: Date | null) => {
    const timeA = a ? a.getTime() : null;
    const timeB = b ? b.getTime() : null;
    return timeA === timeB;
  };
  const compareEmails = (a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  };
  const compareJson = (a: unknown, b: unknown) => stringifyJson(a ?? null) === stringifyJson(b ?? null);

  if (!compareString(existing.messageId, target.messageId)) return true;
  if (!compareString(existing.inReplyTo, target.inReplyTo)) return true;
  if (!compareString(existing.fromName, target.fromName)) return true;
  if (!compareString(existing.fromEmail, target.fromEmail)) return true;
  if (!compareJson(existing.to, target.to)) return true;
  if (!compareEmails(uniqueSortedEmails(existing.toEmails), target.toEmails)) return true;
  if (!compareString(existing.subject, target.subject)) return true;
  if (!compareDate(existing.sentAt, target.sentAt)) return true;
  if (!compareString(existing.rawTextBody, target.rawTextBody)) return true;
  if (!compareString(existing.rawHtmlBody, target.rawHtmlBody)) return true;
  if (!compareString(existing.mdTextBody, target.mdTextBody)) return true;
  if (!compareJson(existing.attachments, target.attachments)) return true;
  if (!compareJson(existing.raw, target.raw)) return true;
  if (existing.status !== target.status) return true;
  if (!compareString(existing.reportUrl, target.reportUrl)) return true;
  if (!compareString(existing.fileObjectName, target.fileObjectName)) return true;
  if (!compareDate(existing.dateFrom, target.dateFrom)) return true;
  if (!compareDate(existing.dateTo, target.dateTo)) return true;
  if (!compareNumber(existing.createdCount, target.createdCount)) return true;
  if (!compareJson(existing.failed, target.failed)) return true;
  if (!compareDate(existing.deletedAt, target.deletedAt)) return true;
  if (!compareDate(existing.createdAt, target.createdAt)) return true;
  if (!compareDate(existing.updatedAt, target.updatedAt)) return true;

  return false;
};

const normalizeEmail = (doc: MongoEmailDocument): NormalizedEmailData => {
  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id.trim() : doc._id?.toString();
  if (!id) {
    throw new Error("[MigrateEmails] Encountered an email document without an identifier");
  }

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;

  const record: EmailRecord = {
    id,
    messageId: doc.messageId ?? null,
    inReplyTo: doc.inReplyTo ?? null,
    fromName: doc.fromName ?? null,
    fromEmail: doc.fromEmail ?? null,
    to: toJsonValue(doc.to),
    toEmails: extractToEmails(doc),
    subject: doc.subject ?? null,
    sentAt: normalizeDate(doc.sentAt),
    rawTextBody: doc.rawTextBody ?? null,
    rawHtmlBody: doc.rawHtmlBody ?? null,
    mdTextBody: doc.mdTextBody ?? null,
    attachments: toJsonValue(doc.attachments),
    raw: toJsonValue(doc.raw),
    status: normalizeStatus(doc.status ?? undefined),
    reportUrl: doc.reportUrl ?? null,
    fileObjectName: doc.fileObjectName ?? null,
    dateFrom: normalizeDate(doc.dateFrom),
    dateTo: normalizeDate(doc.dateTo),
    createdCount: normalizeNumber(doc.createdCount),
    failed: toJsonValue(doc.failed),
    deletedAt: normalizeDate(doc.deletedAt),
    createdAt,
    updatedAt,
  };

  const create: Prisma.EmailCreateInput = {
    id: record.id,
    messageId: record.messageId,
    inReplyTo: record.inReplyTo,
    fromName: record.fromName,
    fromEmail: record.fromEmail,
    to: record.to,
    toEmails: record.toEmails,
    subject: record.subject,
    sentAt: record.sentAt,
    rawTextBody: record.rawTextBody,
    rawHtmlBody: record.rawHtmlBody,
    mdTextBody: record.mdTextBody,
    attachments: record.attachments,
    raw: record.raw,
    status: record.status,
    reportUrl: record.reportUrl,
    fileObjectName: record.fileObjectName,
    dateFrom: record.dateFrom,
    dateTo: record.dateTo,
    createdCount: record.createdCount,
    failed: record.failed,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.EmailUpdateInput = {
    messageId: record.messageId,
    inReplyTo: record.inReplyTo,
    fromName: record.fromName,
    fromEmail: record.fromEmail,
    to: record.to,
    toEmails: { set: record.toEmails },
    subject: record.subject,
    sentAt: record.sentAt,
    rawTextBody: record.rawTextBody,
    rawHtmlBody: record.rawHtmlBody,
    mdTextBody: record.mdTextBody,
    attachments: record.attachments,
    raw: record.raw,
    status: record.status,
    reportUrl: record.reportUrl,
    fileObjectName: record.fileObjectName,
    dateFrom: record.dateFrom,
    dateTo: record.dateTo,
    createdCount: record.createdCount,
    failed: record.failed,
    deletedAt: record.deletedAt,
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

const formatRecordForLog = (record: EmailRecord) => ({
  id: record.id,
  status: record.status,
  messageId: record.messageId,
  fromEmail: record.fromEmail,
  toEmails: record.toEmails,
  subject: record.subject,
  sentAt: record.sentAt ? record.sentAt.toISOString() : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const cleanup = async () => {
  await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
};

const main = async () => {
  console.log(`[MigrateEmails] Starting${options.dryRun ? " (dry-run)" : ""}`);
  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("emails");
  const docs = (await collection.find({}).toArray()) as MongoEmailDocument[];
  console.log(`[MigrateEmails] Retrieved ${docs.length} email document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateEmails] Nothing to migrate");
    return;
  }

  const normalized = docs.map((doc) => normalizeEmail(doc));

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: EmailRecord[] = [];
  const sampleUpdates: { before: EmailRecord; after: EmailRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await emailRepository.find({ where: { id: { in: chunkIds } } });
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
          await emailRepository.create(entry.create);
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
          sampleUpdates.push({ before: existing, after: entry.record });
        }
      } else {
        await emailRepository.update(entry.record.id, entry.update);
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateEmails][Dry-run] Would create ${stats.created} email(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateEmails][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateEmails][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateEmails] Created ${stats.created} email(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateEmails] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
