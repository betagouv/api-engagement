import mongoose from "mongoose";

import type { Kpi as PrismaKpi, Prisma } from "../../src/db/core";
import type { KpiRecord } from "../../src/types/kpi";
import { compareDates, compareNumbers } from "./utils/compare";
import { normalizeDate, normalizeNumber } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions } from "./utils/options";

type MongoKpiDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  date?: Date | string | null;
  availableBenevolatMissionCount?: number | string | null;
  availableVolontariatMissionCount?: number | string | null;
  availableJvaMissionCount?: number | string | null;
  availableBenevolatGivenPlaceCount?: number | string | null;
  availableVolontariatGivenPlaceCount?: number | string | null;
  availableBenevolatAttributedPlaceCount?: number | string | null;
  availableVolontariatAttributedPlaceCount?: number | string | null;
  percentageBenevolatGivenPlaces?: number | string | null;
  percentageVolontariatGivenPlaces?: number | string | null;
  percentageBenevolatAttributedPlaces?: number | string | null;
  percentageVolontariatAttributedPlaces?: number | string | null;
  benevolatPrintMissionCount?: number | string | null;
  volontariatPrintMissionCount?: number | string | null;
  benevolatClickMissionCount?: number | string | null;
  volontariatClickMissionCount?: number | string | null;
  benevolatApplyMissionCount?: number | string | null;
  volontariatApplyMissionCount?: number | string | null;
  benevolatAccountMissionCount?: number | string | null;
  volontariatAccountMissionCount?: number | string | null;
  benevolatPrintCount?: number | string | null;
  volontariatPrintCount?: number | string | null;
  benevolatClickCount?: number | string | null;
  volontariatClickCount?: number | string | null;
  benevolatApplyCount?: number | string | null;
  volontariatApplyCount?: number | string | null;
  benevolatAccountCount?: number | string | null;
  volontariatAccountCount?: number | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type NormalizedKpiData = {
  record: KpiRecord;
  create: Prisma.KpiCreateInput;
  update: Prisma.KpiUpdateInput;
};

const BATCH_SIZE = 100;

const options = parseScriptOptions(process.argv.slice(2), "MigrateKpis");
loadEnvironment(options, __dirname, "MigrateKpis");

const numberOrZero = (value: number | string | null | undefined): number => normalizeNumber(value) ?? 0;

const dateOrThrow = (value: Date | string | null | undefined, field: string): Date => {
  const normalized = normalizeDate(value);
  if (!normalized) {
    throw new Error(`[MigrateKpis] Missing or invalid date for field ${field}`);
  }
  return normalized;
};

const toKpiRecordFromPrisma = (kpi: PrismaKpi): KpiRecord => ({
  id: kpi.id,
  date: kpi.date,
  availableBenevolatMissionCount: kpi.availableBenevolatMissionCount,
  availableVolontariatMissionCount: kpi.availableVolontariatMissionCount,
  availableJvaMissionCount: kpi.availableJvaMissionCount,
  availableBenevolatGivenPlaceCount: kpi.availableBenevolatGivenPlaceCount,
  availableVolontariatGivenPlaceCount: kpi.availableVolontariatGivenPlaceCount,
  availableBenevolatAttributedPlaceCount: kpi.availableBenevolatAttributedPlaceCount,
  availableVolontariatAttributedPlaceCount: kpi.availableVolontariatAttributedPlaceCount,
  percentageBenevolatGivenPlaces: kpi.percentageBenevolatGivenPlaces,
  percentageVolontariatGivenPlaces: kpi.percentageVolontariatGivenPlaces,
  percentageBenevolatAttributedPlaces: kpi.percentageBenevolatAttributedPlaces,
  percentageVolontariatAttributedPlaces: kpi.percentageVolontariatAttributedPlaces,
  benevolatPrintMissionCount: kpi.benevolatPrintMissionCount,
  volontariatPrintMissionCount: kpi.volontariatPrintMissionCount,
  benevolatClickMissionCount: kpi.benevolatClickMissionCount,
  volontariatClickMissionCount: kpi.volontariatClickMissionCount,
  benevolatApplyMissionCount: kpi.benevolatApplyMissionCount,
  volontariatApplyMissionCount: kpi.volontariatApplyMissionCount,
  benevolatAccountMissionCount: kpi.benevolatAccountMissionCount,
  volontariatAccountMissionCount: kpi.volontariatAccountMissionCount,
  benevolatPrintCount: kpi.benevolatPrintCount,
  volontariatPrintCount: kpi.volontariatPrintCount,
  benevolatClickCount: kpi.benevolatClickCount,
  volontariatClickCount: kpi.volontariatClickCount,
  benevolatApplyCount: kpi.benevolatApplyCount,
  volontariatApplyCount: kpi.volontariatApplyCount,
  benevolatAccountCount: kpi.benevolatAccountCount,
  volontariatAccountCount: kpi.volontariatAccountCount,
  createdAt: kpi.createdAt,
  updatedAt: kpi.updatedAt,
});

const normalizeKpi = (doc: MongoKpiDocument): NormalizedKpiData => {
  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id.trim() : doc._id?.toString();
  if (!id) {
    throw new Error("[MigrateKpis] Encountered a KPI document without an identifier");
  }

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;

  const record: KpiRecord = {
    id,
    date: dateOrThrow(doc.date, "date"),
    availableBenevolatMissionCount: numberOrZero(doc.availableBenevolatMissionCount),
    availableVolontariatMissionCount: numberOrZero(doc.availableVolontariatMissionCount),
    availableJvaMissionCount: numberOrZero(doc.availableJvaMissionCount),
    availableBenevolatGivenPlaceCount: numberOrZero(doc.availableBenevolatGivenPlaceCount),
    availableVolontariatGivenPlaceCount: numberOrZero(doc.availableVolontariatGivenPlaceCount),
    availableBenevolatAttributedPlaceCount: numberOrZero(doc.availableBenevolatAttributedPlaceCount),
    availableVolontariatAttributedPlaceCount: numberOrZero(doc.availableVolontariatAttributedPlaceCount),
    percentageBenevolatGivenPlaces: numberOrZero(doc.percentageBenevolatGivenPlaces),
    percentageVolontariatGivenPlaces: numberOrZero(doc.percentageVolontariatGivenPlaces),
    percentageBenevolatAttributedPlaces: numberOrZero(doc.percentageBenevolatAttributedPlaces),
    percentageVolontariatAttributedPlaces: numberOrZero(doc.percentageVolontariatAttributedPlaces),
    benevolatPrintMissionCount: numberOrZero(doc.benevolatPrintMissionCount),
    volontariatPrintMissionCount: numberOrZero(doc.volontariatPrintMissionCount),
    benevolatClickMissionCount: numberOrZero(doc.benevolatClickMissionCount),
    volontariatClickMissionCount: numberOrZero(doc.volontariatClickMissionCount),
    benevolatApplyMissionCount: numberOrZero(doc.benevolatApplyMissionCount),
    volontariatApplyMissionCount: numberOrZero(doc.volontariatApplyMissionCount),
    benevolatAccountMissionCount: numberOrZero(doc.benevolatAccountMissionCount),
    volontariatAccountMissionCount: numberOrZero(doc.volontariatAccountMissionCount),
    benevolatPrintCount: numberOrZero(doc.benevolatPrintCount),
    volontariatPrintCount: numberOrZero(doc.volontariatPrintCount),
    benevolatClickCount: numberOrZero(doc.benevolatClickCount),
    volontariatClickCount: numberOrZero(doc.volontariatClickCount),
    benevolatApplyCount: numberOrZero(doc.benevolatApplyCount),
    volontariatApplyCount: numberOrZero(doc.volontariatApplyCount),
    benevolatAccountCount: numberOrZero(doc.benevolatAccountCount),
    volontariatAccountCount: numberOrZero(doc.volontariatAccountCount),
    createdAt,
    updatedAt,
  };

  const create: Prisma.KpiCreateInput = {
    id: record.id,
    date: record.date,
    availableBenevolatMissionCount: record.availableBenevolatMissionCount,
    availableVolontariatMissionCount: record.availableVolontariatMissionCount,
    availableJvaMissionCount: record.availableJvaMissionCount,
    availableBenevolatGivenPlaceCount: record.availableBenevolatGivenPlaceCount,
    availableVolontariatGivenPlaceCount: record.availableVolontariatGivenPlaceCount,
    availableBenevolatAttributedPlaceCount: record.availableBenevolatAttributedPlaceCount,
    availableVolontariatAttributedPlaceCount: record.availableVolontariatAttributedPlaceCount,
    percentageBenevolatGivenPlaces: record.percentageBenevolatGivenPlaces,
    percentageVolontariatGivenPlaces: record.percentageVolontariatGivenPlaces,
    percentageBenevolatAttributedPlaces: record.percentageBenevolatAttributedPlaces,
    percentageVolontariatAttributedPlaces: record.percentageVolontariatAttributedPlaces,
    benevolatPrintMissionCount: record.benevolatPrintMissionCount,
    volontariatPrintMissionCount: record.volontariatPrintMissionCount,
    benevolatClickMissionCount: record.benevolatClickMissionCount,
    volontariatClickMissionCount: record.volontariatClickMissionCount,
    benevolatApplyMissionCount: record.benevolatApplyMissionCount,
    volontariatApplyMissionCount: record.volontariatApplyMissionCount,
    benevolatAccountMissionCount: record.benevolatAccountMissionCount,
    volontariatAccountMissionCount: record.volontariatAccountMissionCount,
    benevolatPrintCount: record.benevolatPrintCount,
    volontariatPrintCount: record.volontariatPrintCount,
    benevolatClickCount: record.benevolatClickCount,
    volontariatClickCount: record.volontariatClickCount,
    benevolatApplyCount: record.benevolatApplyCount,
    volontariatApplyCount: record.volontariatApplyCount,
    benevolatAccountCount: record.benevolatAccountCount,
    volontariatAccountCount: record.volontariatAccountCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  const update: Prisma.KpiUpdateInput = {
    date: record.date,
    availableBenevolatMissionCount: record.availableBenevolatMissionCount,
    availableVolontariatMissionCount: record.availableVolontariatMissionCount,
    availableJvaMissionCount: record.availableJvaMissionCount,
    availableBenevolatGivenPlaceCount: record.availableBenevolatGivenPlaceCount,
    availableVolontariatGivenPlaceCount: record.availableVolontariatGivenPlaceCount,
    availableBenevolatAttributedPlaceCount: record.availableBenevolatAttributedPlaceCount,
    availableVolontariatAttributedPlaceCount: record.availableVolontariatAttributedPlaceCount,
    percentageBenevolatGivenPlaces: record.percentageBenevolatGivenPlaces,
    percentageVolontariatGivenPlaces: record.percentageVolontariatGivenPlaces,
    percentageBenevolatAttributedPlaces: record.percentageBenevolatAttributedPlaces,
    percentageVolontariatAttributedPlaces: record.percentageVolontariatAttributedPlaces,
    benevolatPrintMissionCount: record.benevolatPrintMissionCount,
    volontariatPrintMissionCount: record.volontariatPrintMissionCount,
    benevolatClickMissionCount: record.benevolatClickMissionCount,
    volontariatClickMissionCount: record.volontariatClickMissionCount,
    benevolatApplyMissionCount: record.benevolatApplyMissionCount,
    volontariatApplyMissionCount: record.volontariatApplyMissionCount,
    benevolatAccountMissionCount: record.benevolatAccountMissionCount,
    volontariatAccountMissionCount: record.volontariatAccountMissionCount,
    benevolatPrintCount: record.benevolatPrintCount,
    volontariatPrintCount: record.volontariatPrintCount,
    benevolatClickCount: record.benevolatClickCount,
    volontariatClickCount: record.volontariatClickCount,
    benevolatApplyCount: record.benevolatApplyCount,
    volontariatApplyCount: record.volontariatApplyCount,
    benevolatAccountCount: record.benevolatAccountCount,
    volontariatAccountCount: record.volontariatAccountCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  return { record, create, update };
};

const hasDifferences = (existing: KpiRecord, target: KpiRecord): boolean => {
  if (!compareDates(existing.date, target.date)) return true;
  if (!compareNumbers(existing.availableBenevolatMissionCount, target.availableBenevolatMissionCount)) return true;
  if (!compareNumbers(existing.availableVolontariatMissionCount, target.availableVolontariatMissionCount)) return true;
  if (!compareNumbers(existing.availableJvaMissionCount, target.availableJvaMissionCount)) return true;
  if (!compareNumbers(existing.availableBenevolatGivenPlaceCount, target.availableBenevolatGivenPlaceCount)) return true;
  if (!compareNumbers(existing.availableVolontariatGivenPlaceCount, target.availableVolontariatGivenPlaceCount)) return true;
  if (!compareNumbers(existing.availableBenevolatAttributedPlaceCount, target.availableBenevolatAttributedPlaceCount)) return true;
  if (!compareNumbers(existing.availableVolontariatAttributedPlaceCount, target.availableVolontariatAttributedPlaceCount)) return true;
  if (!compareNumbers(existing.percentageBenevolatGivenPlaces, target.percentageBenevolatGivenPlaces)) return true;
  if (!compareNumbers(existing.percentageVolontariatGivenPlaces, target.percentageVolontariatGivenPlaces)) return true;
  if (!compareNumbers(existing.percentageBenevolatAttributedPlaces, target.percentageBenevolatAttributedPlaces)) return true;
  if (!compareNumbers(existing.percentageVolontariatAttributedPlaces, target.percentageVolontariatAttributedPlaces)) return true;
  if (!compareNumbers(existing.benevolatPrintMissionCount, target.benevolatPrintMissionCount)) return true;
  if (!compareNumbers(existing.volontariatPrintMissionCount, target.volontariatPrintMissionCount)) return true;
  if (!compareNumbers(existing.benevolatClickMissionCount, target.benevolatClickMissionCount)) return true;
  if (!compareNumbers(existing.volontariatClickMissionCount, target.volontariatClickMissionCount)) return true;
  if (!compareNumbers(existing.benevolatApplyMissionCount, target.benevolatApplyMissionCount)) return true;
  if (!compareNumbers(existing.volontariatApplyMissionCount, target.volontariatApplyMissionCount)) return true;
  if (!compareNumbers(existing.benevolatAccountMissionCount, target.benevolatAccountMissionCount)) return true;
  if (!compareNumbers(existing.volontariatAccountMissionCount, target.volontariatAccountMissionCount)) return true;
  if (!compareNumbers(existing.benevolatPrintCount, target.benevolatPrintCount)) return true;
  if (!compareNumbers(existing.volontariatPrintCount, target.volontariatPrintCount)) return true;
  if (!compareNumbers(existing.benevolatClickCount, target.benevolatClickCount)) return true;
  if (!compareNumbers(existing.volontariatClickCount, target.volontariatClickCount)) return true;
  if (!compareNumbers(existing.benevolatApplyCount, target.benevolatApplyCount)) return true;
  if (!compareNumbers(existing.volontariatApplyCount, target.volontariatApplyCount)) return true;
  if (!compareNumbers(existing.benevolatAccountCount, target.benevolatAccountCount)) return true;
  if (!compareNumbers(existing.volontariatAccountCount, target.volontariatAccountCount)) return true;
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

const formatRecordForLog = (record: KpiRecord) => ({
  id: record.id,
  date: record.date.toISOString(),
  availableBenevolatMissionCount: record.availableBenevolatMissionCount,
  availableVolontariatMissionCount: record.availableVolontariatMissionCount,
  availableJvaMissionCount: record.availableJvaMissionCount,
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
  console.log(`[MigrateKpis] Starting${options.dryRun ? " (dry-run)" : ""}`);

  const [{ mongoConnected }, { pgConnected }, { kpiRepository }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/kpi"),
  ]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("kpis");
  const docs = (await collection.find({}).toArray()) as MongoKpiDocument[];
  console.log(`[MigrateKpis] Retrieved ${docs.length} KPI document(s) from MongoDB`);

  if (docs.length === 0) {
    console.log("[MigrateKpis] Nothing to migrate");
    return;
  }

  const normalized = docs.map((doc) => normalizeKpi(doc));

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: KpiRecord[] = [];
  const sampleUpdates: { before: KpiRecord; after: KpiRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = await kpiRepository.find({ where: { id: { in: chunkIds } } });
    const existingById = new Map(existingRecords.map((record) => [record.id, toKpiRecordFromPrisma(record)]));

    for (const entry of chunk) {
      const existing = existingById.get(entry.record.id);

      if (!existing) {
        stats.created += 1;
        if (options.dryRun) {
          if (sampleCreates.length < 5) {
            sampleCreates.push(entry.record);
          }
        } else {
          await kpiRepository.create(entry.create);
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
        await kpiRepository.update({ id: entry.record.id }, entry.update);
      }
    }
  }

  if (options.dryRun) {
    console.log(`[MigrateKpis][Dry-run] Would create ${stats.created} KPI(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log("[MigrateKpis][Dry-run] Sample creations:");
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log("[MigrateKpis][Dry-run] Sample updates:");
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[MigrateKpis] Created ${stats.created} KPI(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigrateKpis] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
