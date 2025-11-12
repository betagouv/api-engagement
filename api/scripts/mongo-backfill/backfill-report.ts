import mongoose from "mongoose";

import type { Prisma, Report } from "../../src/db/core";
import type { ReportDataTemplate } from "../../src/types/report";
import { asString, asStringArray } from "./utils/cast";
import { compareDates, compareJsons, compareNumbers, compareStringArrays, compareStrings } from "./utils/compare";
import { normalizeDate, normalizeNumber, toJsonValue } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions } from "./utils/options";

const SCRIPT_LABEL = "BackfillReports";

const options = parseScriptOptions(process.argv.slice(2), SCRIPT_LABEL);
loadEnvironment(options, __dirname, SCRIPT_LABEL);

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
  dataTemplate: ReportDataTemplate | null;
  sentAt: Date | null;
  sentTo: string[];
  status: string;
  data: Prisma.InputJsonValue;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const BATCH_SIZE = 100;

const normalizeDataTemplate = (value: string | null | undefined): ReportDataTemplate | null => {
  const candidate = asString(value);
  if (!candidate) {
    return null;
  }
  const normalized = candidate.toUpperCase();
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

const normalizeSentTo = (value: unknown): string[] => asStringArray(value);

const normalizeNumberWithDefault = (value: number | string | null | undefined, fallback: number): number => {
  const normalized = normalizeNumber(value);
  if (normalized == null || Number.isNaN(normalized)) {
    return fallback;
  }
  return Math.trunc(normalized);
};

const hasDifferences = (existing: NormalizedReportRecord, target: NormalizedReportRecord): boolean => {
  if (!compareStrings(existing.name, target.name)) return true;
  if (!compareNumbers(existing.month, target.month)) return true;
  if (!compareNumbers(existing.year, target.year)) return true;
  if (!compareStrings(existing.url, target.url)) return true;
  if (!compareStrings(existing.objectName ?? null, target.objectName ?? null)) return true;
  if (!compareStrings(existing.publisherId, target.publisherId)) return true;
  if (!compareStrings(existing.dataTemplate ?? null, target.dataTemplate ?? null)) return true;
  if (!compareDates(existing.sentAt, target.sentAt)) return true;

  const existingSentTo = asStringArray(existing.sentTo);
  const targetSentTo = asStringArray(target.sentTo);
  if (!compareStringArrays(existingSentTo, targetSentTo)) return true;

  if (!compareStrings(existing.status, target.status)) return true;
  if (!compareJsons(existing.data, target.data)) return true;

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
    const str = asString(value);
    if (str) {
      return str;
    }
    if (!fallback) {
      console.warn(`[${SCRIPT_LABEL}] Report ${id} missing "${fieldName}", defaulting to empty string`);
    }
    return fallback;
  };

  const name = requireString(doc.name, "name");
  const month = normalizeNumberWithDefault(doc.month, new Date().getMonth());
  const year = normalizeNumberWithDefault(doc.year, new Date().getFullYear());
  const publisherId = requireString(typeof doc.publisherId === "string" ? doc.publisherId : doc.publisherId?.toString(), "publisherId");
  const status = requireString(doc.status, "status", "UNKNOWN");

  const record: NormalizedReportRecord = {
    id,
    name,
    month,
    year,
    url: asString(doc.url) ?? "",
    objectName: asString(doc.objectName),
    publisherId,
    dataTemplate: normalizeDataTemplate(doc.dataTemplate),
    sentAt: normalizeDate(doc.sentAt),
    sentTo: normalizeSentTo(doc.sentTo),
    status,
    data: toJsonValue(doc.data) ?? {},
    createdAt: normalizeDate(doc.sentAt),
    updatedAt: normalizeDate(doc.sentAt),
  };

  const create: Prisma.ReportCreateInput = {
    id: record.id,
    name: record.name,
    month: record.month,
    year: record.year,
    url: record.url,
    objectName: record.objectName,
    publisher: {
      connect: {
        id: record.publisherId,
      },
    },
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
    publisher: {
      connect: {
        id: record.publisherId,
      },
    },
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
  dataTemplate: (report.dataTemplate ?? null) as ReportDataTemplate | null,
  sentAt: report.sentAt ?? null,
  sentTo: asStringArray(report.sentTo),
  status: report.status,
  data: report.data as Prisma.InputJsonValue,
  createdAt: report.sentAt,
  updatedAt: report.sentAt,
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
  month: record.month,
  year: record.year,
  status: record.status,
  sentTo: record.sentTo,
  sentAt: record.sentAt ? record.sentAt.toISOString() : null,
  dataTemplate: record.dataTemplate,
  hasUrl: Boolean(record.url),
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
  console.log(`[BackfillReports] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, postgresModule, { reportRepository }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/report"),
  ]);
  const { pgConnected } = postgresModule;

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
          await reportRepository.create({ data: entry.create });
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
        await reportRepository.update({ where: { id: entry.record.id }, data: entry.update });
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
