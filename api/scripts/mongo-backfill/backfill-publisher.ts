import mongoose from "mongoose";

import type { Prisma, Publisher as PrismaPublisher, PublisherDiffusion as PrismaPublisherDiffusion } from "../../src/db/core";
import { mongoConnected } from "../../src/db/mongo";
import { pgConnected, prismaCore } from "../../src/db/postgres";
import { publisherRepository } from "../../src/repositories/publisher";
import type { PublisherRecord } from "../../src/types/publisher";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigratePublishers");
loadEnvironment(options, __dirname, "MigratePublishers");

type MongoDiffuseur = {
  publisherId?: unknown;
  publisherName?: unknown;
  missionType?: unknown;
  moderator?: unknown;
};

type MongoPublisherDocument = {
  _id?: { toString(): string } | string;
  id?: string;
  name?: unknown;
  category?: unknown;
  url?: unknown;
  moderator?: unknown;
  moderatorLink?: unknown;
  email?: unknown;
  documentation?: unknown;
  logo?: unknown;
  defaultMissionLogo?: unknown;
  description?: unknown;
  lead?: unknown;
  feed?: unknown;
  feedUsername?: unknown;
  feedPassword?: unknown;
  apikey?: unknown;
  missionType?: unknown;
  isAnnonceur?: unknown;
  hasApiRights?: unknown;
  hasWidgetRights?: unknown;
  hasCampaignRights?: unknown;
  sendReport?: unknown;
  sendReportTo?: unknown;
  publishers?: unknown;
  deletedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const BATCH_SIZE = 100;

const asString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value == null) {
    return null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const asDate = (value: unknown): Date | null => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    const str = asString(entry);
    if (str) {
      unique.add(str);
    }
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const normalizeDiffuseurs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const map = new Map<string, { publisherId: string; publisherName: string; moderator: boolean; missionType: string | null }>();
  for (const raw of value as MongoDiffuseur[]) {
    const publisherId = asString(raw.publisherId);
    if (!publisherId) {
      continue;
    }
    const publisherName = asString(raw.publisherName) ?? publisherId;
    const missionType = asString(raw.missionType);
    const moderator = asBoolean(raw.moderator, false);
    map.set(publisherId, {
      publisherId,
      publisherName,
      moderator,
      missionType: missionType ?? null,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.publisherId.localeCompare(b.publisherId));
};

const toPublisherRecord = (publisher: PrismaPublisher & { diffuseurs: PrismaPublisherDiffusion[] }): PublisherRecord => ({
  id: publisher.id,
  _id: publisher.id,
  name: publisher.name,
  category: publisher.category ?? null,
  url: publisher.url ?? null,
  moderator: publisher.moderator,
  moderatorLink: publisher.moderatorLink ?? null,
  email: publisher.email ?? null,
  documentation: publisher.documentation ?? null,
  logo: publisher.logo ?? null,
  defaultMissionLogo: publisher.defaultMissionLogo ?? null,
  lead: publisher.lead ?? null,
  feed: publisher.feed ?? null,
  feedUsername: publisher.feedUsername ?? null,
  feedPassword: publisher.feedPassword ?? null,
  apikey: publisher.apikey ?? null,
  description: publisher.description ?? "",
  missionType: publisher.missionType ?? null,
  isAnnonceur: publisher.isAnnonceur,
  hasApiRights: publisher.hasApiRights,
  hasWidgetRights: publisher.hasWidgetRights,
  hasCampaignRights: publisher.hasCampaignRights,
  sendReport: publisher.sendReport,
  sendReportTo: (publisher.sendReportTo ?? []).slice().sort((a, b) => a.localeCompare(b)),
  deletedAt: publisher.deletedAt ?? null,
  createdAt: publisher.createdAt,
  updatedAt: publisher.updatedAt,
  publishers: publisher.diffuseurs
    .map((diffuseur) => ({
      id: diffuseur.id,
      publisherId: diffuseur.publisherId,
      moderator: diffuseur.moderator,
      missionType: diffuseur.missionType ?? null,
      createdAt: diffuseur.createdAt,
      updatedAt: diffuseur.updatedAt,
    }))
    .sort((a, b) => a.publisherId.localeCompare(b.publisherId)),
});

type NormalizedPublisherData = {
  record: PublisherRecord;
  create: Prisma.PublisherCreateInput;
  update: Prisma.PublisherUpdateInput;
};

const normalizePublisher = (doc: MongoPublisherDocument): NormalizedPublisherData => {
  const id = asString(doc.id) ?? (typeof doc._id === "string" ? doc._id : doc._id?.toString());
  if (!id) {
    throw new Error("[MigratePublishers] Encountered publisher document without an identifier");
  }

  const name = asString(doc.name);
  if (!name) {
    throw new Error(`[MigratePublishers] Publisher ${id} does not have a valid name`);
  }

  const category = asString(doc.category);
  const url = asString(doc.url);
  const moderator = asBoolean(doc.moderator, false);
  const moderatorLink = asString(doc.moderatorLink);
  const email = asString(doc.email);
  const documentation = asString(doc.documentation);
  const logo = asString(doc.logo);
  const defaultMissionLogo = asString(doc.defaultMissionLogo);
  const description = asString(doc.description) ?? "";
  const lead = asString(doc.lead);
  const feed = asString(doc.feed);
  const feedUsername = asString(doc.feedUsername);
  const feedPassword = asString(doc.feedPassword);
  const apikey = asString(doc.apikey);
  const missionType = asString(doc.missionType);
  const isAnnonceur = asBoolean(doc.isAnnonceur, false);
  const hasApiRights = asBoolean(doc.hasApiRights, false);
  const hasWidgetRights = asBoolean(doc.hasWidgetRights, false);
  const hasCampaignRights = asBoolean(doc.hasCampaignRights, false);
  const sendReport = asBoolean(doc.sendReport, false);
  const sendReportTo = asStringArray(doc.sendReportTo);
  const publishers = normalizeDiffuseurs(doc.publishers);
  const deletedAt = asDate(doc.deletedAt);
  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;

  const record: PublisherRecord = {
    id,
    _id: id,
    name,
    category,
    url,
    moderator,
    moderatorLink,
    email,
    documentation,
    logo,
    defaultMissionLogo,
    lead,
    feed,
    feedUsername,
    feedPassword,
    apikey,
    description,
    missionType,
    isAnnonceur,
    hasApiRights,
    hasWidgetRights,
    hasCampaignRights,
    sendReport,
    sendReportTo,
    deletedAt,
    createdAt,
    updatedAt,
    publishers: publishers.map((diffuseur) => ({
      id: `${id}:${diffuseur.publisherId}`,
      publisherId: diffuseur.publisherId,
      moderator: diffuseur.moderator,
      missionType: diffuseur.missionType,
      createdAt,
      updatedAt,
    })),
  };

  const diffuseurCreate = publishers.length
    ? {
        create: publishers.map((diffuseur) => ({
          publisherId: diffuseur.publisherId,
          moderator: diffuseur.moderator,
          missionType: diffuseur.missionType ? (diffuseur.missionType as Prisma.MissionType) : null,
          createdAt,
          updatedAt,
        })),
      }
    : undefined;

  const create: Prisma.PublisherCreateInput = {
    id,
    name,
    category,
    url,
    moderator,
    moderatorLink,
    email,
    documentation,
    logo,
    defaultMissionLogo,
    lead,
    feed,
    feedUsername,
    feedPassword,
    apikey,
    description,
    missionType: missionType ? (missionType as Prisma.MissionType) : null,
    isAnnonceur,
    hasApiRights,
    hasWidgetRights,
    hasCampaignRights,
    sendReport,
    sendReportTo,
    deletedAt,
    createdAt,
    updatedAt,
    publishers: diffuseurCreate,
  };

  const update: Prisma.PublisherUpdateInput = {
    name,
    category,
    url,
    moderator,
    moderatorLink,
    email,
    documentation,
    logo,
    defaultMissionLogo,
    lead,
    feed,
    feedUsername,
    feedPassword,
    apikey,
    description,
    missionType: missionType as MissionType,
    isAnnonceur,
    hasApiRights,
    hasWidgetRights,
    hasCampaignRights,
    sendReport,
    sendReportTo: { set: sendReportTo },
    deletedAt,
    createdAt,
    updatedAt,
    diffuseurs: {
      deleteMany: {},
      create: publishers.map((diffuseur) => ({
        publisherId: diffuseur.publisherId,
        moderator: diffuseur.moderator,
        missionType: diffuseur.missionType,
        createdAt,
        updatedAt,
      })),
    },
  };

  return { record, create, update };
};

const compareStrings = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);
const compareBooleans = (a: boolean, b: boolean) => a === b;
const compareDates = (a: Date | null, b: Date | null) => {
  const timeA = a ? a.getTime() : null;
  const timeB = b ? b.getTime() : null;
  return timeA === timeB;
};

const compareStringArrays = (a: string[], b: string[]) => {
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

const comparePublishers = (existing: PublisherRecord["publishers"], target: PublisherRecord["publishers"]) => {
  if (existing.length !== target.length) {
    return false;
  }
  for (let i = 0; i < existing.length; i++) {
    const a = existing[i];
    const b = target[i];
    if (!compareStrings(a.publisherId, b.publisherId)) return false;
    if (!compareStrings(a.publisherName, b.publisherName)) return false;
    if (!compareStrings(a.missionType, b.missionType)) return false;
    if (!compareBooleans(a.moderator, b.moderator)) return false;
  }
  return true;
};

const hasDifferences = (existing: PublisherRecord, target: PublisherRecord) => {
  if (!compareStrings(existing.name, target.name)) return true;
  if (!compareStrings(existing.category, target.category)) return true;
  if (!compareStrings(existing.url, target.url)) return true;
  if (!compareBooleans(existing.moderator, target.moderator)) return true;
  if (!compareStrings(existing.moderatorLink, target.moderatorLink)) return true;
  if (!compareStrings(existing.email, target.email)) return true;
  if (!compareStrings(existing.documentation, target.documentation)) return true;
  if (!compareStrings(existing.logo, target.logo)) return true;
  if (!compareStrings(existing.defaultMissionLogo, target.defaultMissionLogo)) return true;
  if (!compareStrings(existing.description, target.description)) return true;
  if (!compareStrings(existing.lead, target.lead)) return true;
  if (!compareStrings(existing.feed, target.feed)) return true;
  if (!compareStrings(existing.feedUsername, target.feedUsername)) return true;
  if (!compareStrings(existing.feedPassword, target.feedPassword)) return true;
  if (!compareStrings(existing.apikey, target.apikey)) return true;
  if (!compareStrings(existing.missionType, target.missionType)) return true;
  if (!compareBooleans(existing.isAnnonceur, target.isAnnonceur)) return true;
  if (!compareBooleans(existing.hasApiRights, target.hasApiRights)) return true;
  if (!compareBooleans(existing.hasWidgetRights, target.hasWidgetRights)) return true;
  if (!compareBooleans(existing.hasCampaignRights, target.hasCampaignRights)) return true;
  if (!compareBooleans(existing.sendReport, target.sendReport)) return true;
  if (!compareStringArrays(existing.sendReportTo, target.sendReportTo)) return true;
  if (!compareDates(existing.deletedAt, target.deletedAt)) return true;
  if (!compareDates(existing.createdAt, target.createdAt)) return true;
  if (!compareDates(existing.updatedAt, target.updatedAt)) return true;
  if (!comparePublishers(existing.publishers, target.publishers)) return true;
  return false;
};

const migratePublishers = async () => {
  await mongoConnected;
  await pgConnected;

  console.log("[MigratePublishers] Starting migration");

  const collection = mongoose.connection.collection("publishers");
  const total = await collection.countDocuments();
  console.log(`[MigratePublishers] Found ${total} publisher document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE });

  let processed = 0;
  let created = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoPublisherDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizePublisher(doc);
      const existing = await publisherRepository.findUnique({
        where: { id: normalized.record.id },
        include: { diffuseurs: true },
      });

      if (!existing) {
        if (options.dryRun) {
          console.log(`[MigratePublishers][Dry-run] Would create publisher ${normalized.record.id}`);
        } else {
          await publisherRepository.create({
            data: normalized.create,
            include: { diffuseurs: true },
          });
        }
        created++;
      } else {
        const existingRecord = toPublisherRecord(existing);
        if (hasDifferences(existingRecord, normalized.record)) {
          if (options.dryRun) {
            console.log(`[MigratePublishers][Dry-run] Would update publisher ${normalized.record.id}`);
          } else {
            await publisherRepository.update({
              where: { id: normalized.record.id },
              data: normalized.update,
              include: { diffuseurs: true },
            });
          }
          updated++;
        }
      }
      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[MigratePublishers] Processed ${processed}/${total} (created: ${created}, updated: ${updated})`);
      }
    } catch (error) {
      console.error("[MigratePublishers] Failed to process publisher document", error);
    }
  }

  console.log(`[MigratePublishers] Completed. Processed: ${processed}, created: ${created}, updated: ${updated}`);
};

migratePublishers()
  .catch((error) => {
    console.error("[MigratePublishers] Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  });
