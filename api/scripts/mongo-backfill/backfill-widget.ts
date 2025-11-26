import mongoose from "mongoose";

import type { Prisma, Widget, WidgetRule } from "../../src/db/core";
import type { WidgetRuleCombinator, WidgetStyle, WidgetType } from "../../src/types/widget";
import { asBoolean, asString, asStringArray, toMongoObjectIdString } from "./utils/cast";
import { compareBooleans, compareDates, compareJsons, compareNumbers, compareStringArrays, compareStrings } from "./utils/compare";
import { normalizeDate, normalizeNumber } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions } from "./utils/options";

const SCRIPT_LABEL = "MigrateWidgets";
const BATCH_SIZE = 100;

const options = parseScriptOptions(process.argv.slice(2), SCRIPT_LABEL);
loadEnvironment(options, __dirname, SCRIPT_LABEL);

type MongoLocation = {
  lat?: number | string | null;
  lon?: number | string | null;
  city?: string | null;
  label?: string | null;
  postcode?: string | null;
  name?: string | null;
};

type MongoWidgetRule = {
  field?: unknown;
  fieldType?: unknown;
  operator?: unknown;
  value?: unknown;
  combinator?: unknown;
};

type MongoWidgetDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  name?: unknown;
  color?: unknown;
  style?: unknown;
  type?: unknown;
  location?: MongoLocation | null;
  distance?: unknown;
  rules?: MongoWidgetRule[];
  publishers?: unknown;
  url?: unknown;
  jvaModeration?: unknown;
  fromPublisherId?: unknown;
  fromPublisherName?: unknown;
  active?: unknown;
  deletedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type NormalizedWidgetRule = {
  field: string;
  fieldType: string | null;
  operator: string;
  value: string;
  combinator: WidgetRuleCombinator;
  position: number;
};

type NormalizedWidgetRecord = {
  id: string;
  name: string;
  color: string;
  style: WidgetStyle;
  type: WidgetType;
  location: MongoLocation | null;
  distance: string;
  rules: NormalizedWidgetRule[];
  publishers: string[];
  url: string | null;
  jvaModeration: boolean;
  fromPublisherId: string;
  fromPublisherName: string | null;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type NormalizedWidgetData = {
  record: NormalizedWidgetRecord;
  create: Prisma.WidgetCreateInput;
  update: Prisma.WidgetUpdateInput;
};

const normalizeStyle = (value: unknown): WidgetStyle => {
  const style = asString(value);
  return style === "carousel" ? "carousel" : "page";
};

const normalizeType = (value: unknown): WidgetType => {
  const type = asString(value);
  return type === "volontariat" ? "volontariat" : "benevolat";
};

const normalizeCombinator = (value: unknown): WidgetRuleCombinator => {
  const combinator = asString(value);
  return combinator === "or" ? "or" : "and";
};

const normalizeLocation = (value: MongoLocation | null | undefined): MongoLocation | null => {
  if (!value) {
    return null;
  }
  const lat = normalizeNumber(value.lat);
  const lon = normalizeNumber(value.lon);
  if (lat == null || lon == null) {
    return null;
  }

  return {
    lat,
    lon,
    city: asString(value.city),
    label: asString(value.label),
    postcode: asString(value.postcode),
    name: asString(value.name),
  };
};

const normalizeRules = (rules: MongoWidgetRule[] | undefined | null): NormalizedWidgetRule[] => {
  if (!Array.isArray(rules)) {
    return [];
  }
  const normalized: NormalizedWidgetRule[] = [];
  rules.forEach((rule, index) => {
    const field = asString(rule.field);
    const operator = asString(rule.operator);
    const value = asString(rule.value);
    if (!field || !operator || value == null) {
      return;
    }
    const fieldType = asString(rule.fieldType);
    normalized.push({
      field,
      fieldType,
      operator,
      value,
      combinator: normalizeCombinator(rule.combinator),
      position: index,
    });
  });
  return normalized;
};

const normalizeWidget = (doc: MongoWidgetDocument): NormalizedWidgetData => {
  const id = asString(doc.id) ?? toMongoObjectIdString(doc._id);
  if (!id) {
    throw new Error(`[${SCRIPT_LABEL}] Encountered widget document without an identifier`);
  }

  const name = asString(doc.name);
  if (!name) {
    throw new Error(`[${SCRIPT_LABEL}] Widget ${id} is missing a name`);
  }

  const fromPublisherId = asString(doc.fromPublisherId) ?? toMongoObjectIdString(doc.fromPublisherId);
  if (!fromPublisherId) {
    throw new Error(`[${SCRIPT_LABEL}] Widget ${id} is missing fromPublisherId`);
  }

  const createdAt = normalizeDate(doc.createdAt) ?? new Date();
  const updatedAt = normalizeDate(doc.updatedAt) ?? createdAt;

  const rules = normalizeRules(doc.rules);
  const publishers = asStringArray(doc.publishers);
  const location = normalizeLocation(doc.location);

  const record: NormalizedWidgetRecord = {
    id,
    name,
    color: asString(doc.color) ?? "#000091",
    style: normalizeStyle(doc.style),
    type: normalizeType(doc.type),
    location,
    distance: asString(doc.distance) ?? "25km",
    rules,
    publishers,
    url: asString(doc.url),
    jvaModeration: asBoolean(doc.jvaModeration, false),
    fromPublisherId,
    fromPublisherName: asString(doc.fromPublisherName),
    active: asBoolean(doc.active, true),
    deletedAt: normalizeDate(doc.deletedAt),
    createdAt,
    updatedAt,
  };

  const rulesCreate = rules.length
    ? {
        create: rules.map((rule) => ({
          field: rule.field,
          fieldType: rule.fieldType ?? undefined,
          operator: rule.operator,
          value: rule.value,
          combinator: rule.combinator,
          position: rule.position,
        })),
      }
    : undefined;

  const create: Prisma.WidgetCreateInput = {
    id: record.id,
    name: record.name,
    color: record.color,
    style: record.style,
    type: record.type,
    location: record.location as Prisma.InputJsonValue | undefined,
    distance: record.distance,
    publishers: record.publishers,
    url: record.url ?? undefined,
    jvaModeration: record.jvaModeration,
    fromPublisher: { connect: { id: record.fromPublisherId } },
    fromPublisherName: record.fromPublisherName ?? undefined,
    active: record.active,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    rules: rulesCreate,
  };

  const update: Prisma.WidgetUpdateInput = {
    name: record.name,
    color: record.color,
    style: record.style,
    type: record.type,
    location: record.location as Prisma.InputJsonValue | undefined,
    distance: record.distance,
    publishers: { set: record.publishers },
    url: record.url ?? undefined,
    jvaModeration: record.jvaModeration,
    active: record.active,
    deletedAt: record.deletedAt,
    fromPublisher: { connect: { id: record.fromPublisherId } },
    fromPublisherName: record.fromPublisherName ?? undefined,
    rules: {
      deleteMany: {},
      ...rulesCreate,
    },
  };

  return { record, create, update };
};

type PrismaWidgetWithRelations = Widget & {
  rules: WidgetRule[];
  fromPublisher?: { id: string; name: string } | null;
};

const normalizePrismaWidget = (widget: PrismaWidgetWithRelations): NormalizedWidgetRecord => {
  const sortedRules = [...(widget.rules ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    id: widget.id,
    name: widget.name,
    color: widget.color,
    style: (widget.style ?? "page") as WidgetStyle,
    type: (widget.type ?? "benevolat") as WidgetType,
    location: normalizeLocation(widget.location as MongoLocation | null),
    distance: widget.distance,
    rules: sortedRules.map((rule, index) => ({
      field: rule.field,
      fieldType: rule.fieldType ?? null,
      operator: rule.operator,
      value: rule.value,
      combinator: (rule.combinator as WidgetRuleCombinator) ?? "and",
      position: rule.position ?? index,
    })),
    publishers: (widget.publishers ?? []).slice().sort((a, b) => a.localeCompare(b)),
    url: widget.url ?? null,
    jvaModeration: widget.jvaModeration ?? false,
    fromPublisherId: widget.fromPublisherId,
    fromPublisherName: widget.fromPublisher?.name ?? widget.fromPublisherName ?? null,
    active: widget.active ?? false,
    deletedAt: widget.deletedAt ?? null,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };
};

const compareRules = (existing: NormalizedWidgetRule[], target: NormalizedWidgetRule[]): boolean => {
  if (existing.length !== target.length) {
    return false;
  }
  for (let i = 0; i < existing.length; i++) {
    const a = existing[i];
    const b = target[i];
    if (!compareStrings(a.field, b.field)) return false;
    if (!compareStrings(a.fieldType ?? null, b.fieldType ?? null)) return false;
    if (!compareStrings(a.operator, b.operator)) return false;
    if (!compareStrings(a.value, b.value)) return false;
    if (!compareStrings(a.combinator, b.combinator)) return false;
    if (!compareNumbers(a.position, b.position)) return false;
  }
  return true;
};

const hasDifferences = (existing: NormalizedWidgetRecord, target: NormalizedWidgetRecord): boolean => {
  if (!compareStrings(existing.name, target.name)) return true;
  if (!compareStrings(existing.color, target.color)) return true;
  if (!compareStrings(existing.style, target.style)) return true;
  if (!compareStrings(existing.type, target.type)) return true;
  if (!compareJsons(existing.location, target.location)) return true;
  if (!compareStrings(existing.distance, target.distance)) return true;
  if (!compareStringArrays(existing.publishers, target.publishers)) return true;
  if (!compareStrings(existing.url ?? null, target.url ?? null)) return true;
  if (!compareBooleans(existing.jvaModeration, target.jvaModeration)) return true;
  if (!compareStrings(existing.fromPublisherId, target.fromPublisherId)) return true;
  if (!compareStrings(existing.fromPublisherName ?? null, target.fromPublisherName ?? null)) return true;
  if (!compareBooleans(existing.active, target.active)) return true;
  if (!compareDates(existing.deletedAt, target.deletedAt)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  if (!compareRules(existing.rules, target.rules)) return true;

  return false;
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const formatRecordForLog = (record: NormalizedWidgetRecord) => ({
  id: record.id,
  name: record.name,
  fromPublisherId: record.fromPublisherId,
  publishers: record.publishers,
  rules: record.rules.length,
  active: record.active,
  deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
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
  console.log(`[${SCRIPT_LABEL}] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected }, { widgetRepository }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/repositories/widget"),
  ]);

  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("widgets");
  const docs = (await collection.find({}).toArray()) as MongoWidgetDocument[];
  console.log(`[${SCRIPT_LABEL}] Retrieved ${docs.length} widget(s) from MongoDB`);

  if (!docs.length) {
    console.log(`[${SCRIPT_LABEL}] Nothing to migrate`);
    return;
  }

  const normalized = docs.map((doc) => normalizeWidget(doc));

  const stats = { created: 0, updated: 0, unchanged: 0 };
  const sampleCreates: NormalizedWidgetRecord[] = [];
  const sampleUpdates: { before: NormalizedWidgetRecord; after: NormalizedWidgetRecord }[] = [];

  for (const chunk of chunkArray(normalized, BATCH_SIZE)) {
    const chunkIds = chunk.map(({ record }) => record.id);
    const existingRecords = (await widgetRepository.findMany({
      where: { id: { in: chunkIds } },
    })) as PrismaWidgetWithRelations[];
    const existingById = new Map(existingRecords.map((record) => [record.id, normalizePrismaWidget(record)]));

    for (const entry of chunk) {
      const existing = existingById.get(entry.record.id);

      if (!existing) {
        stats.created += 1;
        if (options.dryRun) {
          if (sampleCreates.length < 5) {
            sampleCreates.push(entry.record);
          }
        } else {
          await widgetRepository.create({ data: entry.create });
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
        await widgetRepository.update({ where: { id: entry.record.id }, data: entry.update });
      }
    }
  }

  if (options.dryRun) {
    console.log(`[${SCRIPT_LABEL}][Dry-run] Would create ${stats.created} widget(s), update ${stats.updated}, skip ${stats.unchanged}`);
    if (sampleCreates.length) {
      console.log(`[${SCRIPT_LABEL}][Dry-run] Sample creations:`);
      for (const record of sampleCreates) {
        console.log(JSON.stringify(formatRecordForLog(record), null, 2));
      }
    }
    if (sampleUpdates.length) {
      console.log(`[${SCRIPT_LABEL}][Dry-run] Sample updates:`);
      for (const sample of sampleUpdates) {
        console.log("[Existing]", JSON.stringify(formatRecordForLog(sample.before), null, 2));
        console.log("[Target]  ", JSON.stringify(formatRecordForLog(sample.after), null, 2));
      }
    }
  } else {
    console.log(`[${SCRIPT_LABEL}] Created ${stats.created} widget(s), updated ${stats.updated}, skipped ${stats.unchanged}`);
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error(`[${SCRIPT_LABEL}] Unexpected error:`, error);
    await cleanup();
    process.exit(1);
  }
};

run();
