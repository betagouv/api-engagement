import dotenv from "dotenv";

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
      console.warn("[BackfillReports] Flag --env provided without a value, defaulting to .env");
      args.splice(envIndex, 1);
    }
  }

  const dryRunIndex = args.indexOf("--dry-run");
  if (dryRunIndex !== -1) {
    options.dryRun = true;
    args.splice(dryRunIndex, 1);
  }

  if (args.length) {
    console.warn(`[BackfillReports] Ignoring unexpected arguments: ${args.join(", ")}`);
  }

  return options;
};

const options = parseOptions(process.argv.slice(2));

if (options.envPath) {
  console.log(`[BackfillReports] Loading environment from ${options.envPath}`);
  dotenv.config({ path: options.envPath });
} else {
  dotenv.config();
}

import mongoose from "mongoose";

import type { Prisma, Report } from "../../src/db/core";
import { mongoConnected } from "../../src/db/mongo";
import { pgConnected, prismaCore } from "../../src/db/postgres";
import { reportRepository } from "../../src/repositories/report";
import type { ReportDataTemplate } from "../../src/types/report";

type MongoReportDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  name?: string | null;
  month?: number | string | null;
  year?: number | string | null;
  url?: string | null;
  objectName?: string | null;
  publisherId?: { toString(): string } | string | null;
  publisherName?: string | null;
  dataTemplate?: string | null;
  sentAt?: Date | string | null;
  sentTo?: unknown;
  status?: string | null;
  data?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type NormalizedReportRecord = {
  id: string;
  name: string;
  month: number;
  year: number;
  url: string;
  objectName: string | null;
  publisherId: string;
  publisherName: string;
  dataTemplate: ReportDataTemplate | null;
  sentAt: Date | null;
  sentTo: string[];
  status: string;
  data: Prisma.InputJsonValue;
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

const normalizeInt = (value: number | string | null | undefined, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

const normalizeUrl = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const normalizeDataTemplate = (value: string | null | undefined): ReportDataTemplate | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toUpperCase();
  if (normalized === "SEND") {
    return "SENT";
  }
  if (normalized === "RECEIVE") {
    return "RECEIVED";
  }
  if (["BOTH", "SENT", "RECEIVED"].includes(normalized)) {
    return normalized as ReportDataTemplate;
  }
  return null;
};

const uniqueSortedStrings = (values: readonly unknown[]): string[] => {
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        set.add(trimmed);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

const normalizeSentTo = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueSortedStrings(value);
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch (error) {
    console.warn("[BackfillReports] Unable to serialize JSON value, defaulting to empty object:", error);
    return {};
  }
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

  return JSON.stringify(sorter(value ?? null));
};

const equalDates = (a: Date | null, b: Date | null): boolean => {
  const timeA = a ? a.getTime() : null;
  const timeB = b ? b.getTime() : null;
  return timeA === timeB;
};

const hasDifferences = (existing: NormalizedReportRecord, target: NormalizedReportRecord): boolean => {
  if (existing.name !== target.name) return true;
  if (existing.month !== target.month) return true;
  if (existing.year !== target.year) return true;
  if (existing.url !== target.url) return true;
  if ((existing.objectName ?? null) !== (target.objectName ?? null)) return true;
  if (existing.publisherId !== target.publisherId) return true;
  if (existing.publisherName !== target.publisherName) return true;
  if ((existing.dataTemplate ?? null) !== (target.dataTemplate ?? null)) return true;
  if (!equalDates(existing.sentAt, target.sentAt)) return true;

  const existingSentTo = uniqueSortedStrings(existing.sentTo);
  const targetSentTo = uniqueSortedStrings(target.sentTo);
  if (existingSentTo.length !== targetSentTo.length) return true;
  for (let i = 0; i < existingSentTo.length; i++) {
    if (existingSentTo[i] !== targetSentTo[i]) {
      return true;
    }
  }

  if (existing.status !== target.status) return true;
  if (stringifyJson(existing.data) !== stringifyJson(target.data)) return true;

  return false;
};

type NormalizedReportData = {
  record: NormalizedReportRecord;
  create: Prisma.ReportCreateInput;
  update: Prisma.ReportUpdateInput;
};

const normalizeMongoDoc = (doc: MongoReportDocument): NormalizedReportData => {
  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id.trim() : doc._id?.toString();
  if (!id) {
    throw new Error("[BackfillReports] Encountered a report document without an identifier");
  }

  const requireString = (value: unknown, fieldName: string, fallback = ""): string => {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (!fallback) {
      console.warn(`[BackfillReports] Report ${id} missing "${fieldName}", defaulting to empty string`);
    }
    return fallback;
  };

  const name = requireString(doc.name, "name");
  const month = normalizeInt(doc.month, new Date().getMonth());
  const year = normalizeInt(doc.year, new Date().getFullYear());
  const publisherId = requireString(typeof doc.publisherId === "string" ? doc.publisherId : doc.publisherId?.toString(), "publisherId");
  const publisherName = requireString(doc.publisherName, "publisherName");
  const status = requireString(doc.status, "status", "UNKNOWN");

  const record: NormalizedReportRecord = {
    id,
    name,
    month,
    year,
    url: normalizeUrl(doc.url),
    objectName: normalizeOptionalString(doc.objectName),
    publisherId,
    publisherName,
    dataTemplate: normalizeDataTemplate(doc.dataTemplate),
    sentAt: normalizeDate(doc.sentAt),
    sentTo: normalizeSentTo(doc.sentTo),
    status,
    data: toJsonValue(doc.data),
  };

  const create: Prisma.ReportCreateInput = {
    id: record.id,
    name: record.name,
    month: record.month,
    year: record.year,
    url: record.url,
    objectName: record.objectName,
    publisherId: record.publisherId,
    publisherName: record.publisherName,
    dataTemplate: record.dataTemplate,
    sentAt: record.sentAt,
    sentTo: record.sentTo,
    status: record.status,
    data: record.data,
  };

  const update: Prisma.ReportUpdateInput = {
    name: record.name,
    month: record.month,
    year: record.year,
    url: record.url,
    objectName: record.objectName,
    publisherId: record.publisherId,
    publisherName: record.publisherName,
    dataTemplate: record.dataTemplate,
    sentAt: record.sentAt,
    sentTo: { set: record.sentTo },
    status: record.status,
    data: record.data,
  };

  return { record, create, update };
};

const normalizePrismaReport = (report: Report): NormalizedReportRecord => ({
  id: report.id,
  name: report.name,
  month: report.month,
  year: report.year,
  url: report.url,
  objectName: report.objectName ?? null,
  publisherId: report.publisherId,
  publisherName: report.publisherName,
  dataTemplate: (report.dataTemplate ?? null) as ReportDataTemplate | null,
  sentAt: report.sentAt ?? null,
  sentTo: [...report.sentTo],
  status: report.status,
  data: report.data as Prisma.InputJsonValue,
});

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const formatRecordForLog = (record: NormalizedReportRecord) => ({
  id: record.id,
  publisherId: record.publisherId,
  publisherName: record.publisherName,
  month: record.month,
  year: record.year,
  status: record.status,
  sentTo: record.sentTo,
  sentAt: record.sentAt ? record.sentAt.toISOString() : null,
  dataTemplate: record.dataTemplate,
  hasUrl: Boolean(record.url),
});

const cleanup = async () => {
  await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
};

const main = async () => {
  console.log(`[BackfillReports] Starting${options.dryRun ? " (dry-run)" : ""}`);
  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("reports");
  const docs = (await collection.find({}).toArray()) as MongoReportDocument[];
  console.log(`[BackfillReports] Retrieved ${docs.length} report document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[BackfillReports] Nothing to migrate");
    return;
  }

  const normalized = docs.map((doc) => normalizeMongoDoc(doc));

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: NormalizedReportRecord[] = [];
  const sampleUpdates: { before: NormalizedReportRecord; after: NormalizedReportRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await reportRepository.find({ where: { id: { in: chunkIds } } });
    const existingById = new Map(existingRecords.map((report) => [report.id, normalizePrismaReport(report)]));

    for (const entry of chunk) {
      const existing = existingById.get(entry.record.id);

      if (!existing) {
        stats.created += 1;
        if (options.dryRun) {
          if (sampleCreates.length < 5) {
            sampleCreates.push(entry.record);
          }
        } else {
          await reportRepository.create(entry.create);
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
        await reportRepository.update(entry.record.id, entry.update);
      }
    }
  }

  if (options.dryRun) {
    console.log(`[BackfillReports][Dry-run] Would create ${stats.created} report(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[BackfillReports][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[BackfillReports][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[BackfillReports] Created ${stats.created} report(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[BackfillReports] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
