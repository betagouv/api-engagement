import mongoose from "mongoose";

import type { Prisma, Publisher as PrismaPublisher, PublisherDiffusion as PrismaPublisherDiffusion } from "@/db/core";
import type { PublisherRecord } from "@/types/publisher";
import { asBoolean, asDate, asString, asStringArray } from "./utils/cast";
import { compareBooleans, compareDates, compareStringArrays, compareStrings } from "./utils/compare";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigratePublishers");
loadEnvironment(options, __dirname, "MigratePublishers");

type MissionType = "benevolat" | "volontariat_service_civique";

type MongoDiffuseur = {
  publisherId?: unknown;
  publisherName?: unknown;
  missionType?: unknown;
  moderator?: unknown;
};

type MongoPublisherDocument = {
  _id?: { toString(): string } | string;
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

const extractPublisherId = (doc: MongoPublisherDocument): string => {
  const idFromObjectId = toMongoObjectIdString(doc._id);
  if (idFromObjectId) {
    return idFromObjectId;
  }

  throw new Error("[MigratePublishers] Encountered publisher document without a valid Mongo ObjectId");
};

const normalizeDiffuseurs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const map = new Map<string, { diffuseurPublisherId: string; moderator: boolean; missionType: string | null }>();
  for (const raw of value as MongoDiffuseur[]) {
    const publisherId = asString(raw.publisherId);
    if (!publisherId) {
      continue;
    }
    const missionType = asString(raw.missionType);
    const moderator = asBoolean(raw.moderator, false);
    map.set(publisherId, {
      diffuseurPublisherId: publisherId,
      moderator,
      missionType: missionType ?? null,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.diffuseurPublisherId.localeCompare(b.diffuseurPublisherId));
};

const PRISMA_MISSION_TYPES: readonly MissionType[] = ["benevolat", "volontariat_service_civique"] as const;

const asPrismaMissionType = (value: string | null): MissionType | null => {
  if (!value) {
    return null;
  }

  return PRISMA_MISSION_TYPES.includes(value as MissionType) ? (value as MissionType) : null;
};

const toPublisherRecord = (publisher: PrismaPublisher & { diffuseurs: PrismaPublisherDiffusion[] }): PublisherRecord => ({
  id: publisher.id,
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
      diffuseurPublisherId: diffuseur.diffuseurPublisherId,
      annonceurPublisherId: diffuseur.annonceurPublisherId,
      moderator: diffuseur.moderator,
      missionType: diffuseur.missionType ?? null,
      createdAt: diffuseur.createdAt,
      updatedAt: diffuseur.updatedAt,
      publisherId: diffuseur.diffuseurPublisherId,
    }))
    .sort((a, b) => a.diffuseurPublisherId.localeCompare(b.diffuseurPublisherId)),
});

type NormalizedPublisherData = {
  record: PublisherRecord;
  create: Prisma.PublisherCreateInput;
  update: Prisma.PublisherUpdateInput;
  diffusions: Prisma.PublisherDiffusionUncheckedCreateWithoutAnnonceurInput[];
};

const normalizePublisher = (doc: MongoPublisherDocument): NormalizedPublisherData => {
  const id = extractPublisherId(doc);
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
      id: `${id}:${diffuseur.diffuseurPublisherId}`,
      diffuseurPublisherId: diffuseur.diffuseurPublisherId,
      annonceurPublisherId: id,
      moderator: diffuseur.moderator,
      missionType: diffuseur.missionType,
      createdAt,
      updatedAt,
      publisherId: diffuseur.diffuseurPublisherId,
    })),
  };

  const diffusionInputs: Prisma.PublisherDiffusionUncheckedCreateWithoutAnnonceurInput[] = publishers.map((diffuseur) => ({
    diffuseurPublisherId: diffuseur.diffuseurPublisherId,
    moderator: diffuseur.moderator,
    missionType: asPrismaMissionType(diffuseur.missionType),
    createdAt,
    updatedAt,
  }));

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
    missionType: asPrismaMissionType(missionType),
    isAnnonceur,
    hasApiRights,
    hasWidgetRights,
    hasCampaignRights,
    sendReport,
    sendReportTo,
    deletedAt,
    createdAt,
    updatedAt,
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
    missionType: asPrismaMissionType(missionType),
    isAnnonceur,
    hasApiRights,
    hasWidgetRights,
    hasCampaignRights,
    sendReport,
    sendReportTo: { set: sendReportTo },
    deletedAt,
    createdAt,
    updatedAt,
  };

  return { record, create, update, diffusions: diffusionInputs };
};

const comparePublishers = (existing: PublisherRecord["publishers"], target: PublisherRecord["publishers"]) => {
  if (existing.length !== target.length) {
    return false;
  }
  for (let i = 0; i < existing.length; i++) {
    const a = existing[i];
    const b = target[i];
    if (!compareStrings(a.diffuseurPublisherId, b.diffuseurPublisherId)) return false;
    if (!compareStrings(a.annonceurPublisherId, b.annonceurPublisherId)) return false;
    if (!compareStrings(a.missionType, b.missionType)) return false;
    if (!compareBooleans(a.moderator, b.moderator)) return false;
  }
  return true;
};

const hasBaseDifferences = (existing: PublisherRecord, target: PublisherRecord) => {
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
  return false;
};

const hasDiffusionDifferences = (existing: PublisherRecord, target: PublisherRecord) => {
  return !comparePublishers(existing.publishers, target.publishers);
};

const migratePublishers = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }, { publisherRepository }] = await Promise.all([
    import("@/db/mongo"),
    import("@/db/postgres"),
    import("@/repositories/publisher"),
  ]);

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
  let errors = 0;
  const pendingDiffusions: Array<{
    annonceurId: string;
    annonceurName: string;
    diffusions: Prisma.PublisherDiffusionUncheckedCreateWithoutAnnonceurInput[];
    shouldSync: boolean;
  }> = [];
  const knownPublisherIds = new Set<string>();
  const publisherExistenceCache = new Map<string, boolean>();

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

      let shouldSyncDiffusions = true;

      if (!existing) {
        if (options.dryRun) {
          console.log(`[MigratePublishers][Dry-run] Would create publisher ${normalized.record.id} (${normalized.record.name})`);
        } else {
          await publisherRepository.create({
            data: normalized.create,
          });
        }
        created++;
      } else {
        const existingRecord = toPublisherRecord(existing as PrismaPublisher & { diffuseurs: PrismaPublisherDiffusion[] });
        const baseDifferences = hasBaseDifferences(existingRecord, normalized.record);
        const diffusionDifferences = hasDiffusionDifferences(existingRecord, normalized.record);
        shouldSyncDiffusions = diffusionDifferences;

        if (baseDifferences) {
          if (options.dryRun) {
            console.log(`[MigratePublishers][Dry-run] Would update publisher ${normalized.record.id} (${normalized.record.name})`);
          } else {
            await publisherRepository.update({
              where: { id: normalized.record.id },
              data: normalized.update,
            });
          }
          updated++;
        }
      }
      pendingDiffusions.push({
        annonceurId: normalized.record.id,
        annonceurName: normalized.record.name,
        diffusions: normalized.diffusions,
        shouldSync: shouldSyncDiffusions,
      });
      knownPublisherIds.add(normalized.record.id);
      publisherExistenceCache.set(normalized.record.id, true);
      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[MigratePublishers] Processed ${processed}/${total} (created: ${created}, updated: ${updated})`);
      }
    } catch (error) {
      console.error("[MigratePublishers] Failed to process publisher document", error);
      errors++;
    }
  }

  let diffusionPublishersSynced = 0;
  let diffusionPublishersSkipped = 0;
  let diffusionRecordsCreated = 0;
  let diffusionRecordsMissing = 0;

  for (const { annonceurId, annonceurName, diffusions, shouldSync } of pendingDiffusions) {
    if (!shouldSync) {
      diffusionPublishersSkipped++;
      continue;
    }

    const validDiffusions: Prisma.PublisherDiffusionUncheckedCreateWithoutAnnonceurInput[] = [];
    const missingDiffusions: Prisma.PublisherDiffusionUncheckedCreateWithoutAnnonceurInput[] = [];

    for (const diffusion of diffusions) {
      const diffuseurId = diffusion.diffuseurPublisherId;

      if (knownPublisherIds.has(diffuseurId)) {
        validDiffusions.push(diffusion);
        continue;
      }

      if (publisherExistenceCache.has(diffuseurId)) {
        if (publisherExistenceCache.get(diffuseurId) === true) {
          validDiffusions.push(diffusion);
        } else {
          missingDiffusions.push(diffusion);
        }
        continue;
      }

      const diffuseurExists = Boolean(
        await publisherRepository.findUnique({
          where: { id: diffuseurId },
          select: { id: true },
        })
      );

      publisherExistenceCache.set(diffuseurId, diffuseurExists);

      if (diffuseurExists) {
        knownPublisherIds.add(diffuseurId);
        validDiffusions.push(diffusion);
      } else {
        missingDiffusions.push(diffusion);
      }
    }

    if (missingDiffusions.length > 0) {
      diffusionRecordsMissing += missingDiffusions.length;
      console.warn(
        `[MigratePublishers] Skipping ${missingDiffusions.length} diffusion(s) for publisher ${annonceurId} (${annonceurName}) because diffuseur(s) are missing: ${missingDiffusions
          .map((diffusion) => diffusion.diffuseurPublisherId)
          .join(", ")}`
      );
    }

    if (options.dryRun) {
      console.log(
        `[MigratePublishers][Dry-run] Would replace ${validDiffusions.length} diffusion(s) for publisher ${annonceurId} (${annonceurName})`
      );
      diffusionRecordsCreated += validDiffusions.length;
      diffusionPublishersSynced++;
      continue;
    }

    let sanitizedDiffusions: Prisma.PublisherDiffusionUncheckedCreateInput[] = [];
    try {
      await prismaCore.publisherDiffusion.deleteMany({
        where: { annonceurPublisherId: annonceurId },
      });
      if (validDiffusions.length > 0) {
        sanitizedDiffusions = validDiffusions.map((diffusion) => ({
          annonceurPublisherId: annonceurId,
          diffuseurPublisherId: diffusion.diffuseurPublisherId,
          moderator: Boolean(diffusion.moderator),
          missionType: diffusion.missionType ?? null,
          createdAt: diffusion.createdAt ? new Date(diffusion.createdAt) : new Date(),
          updatedAt: diffusion.updatedAt ? new Date(diffusion.updatedAt) : new Date(),
        }));
        await prismaCore.$transaction(
          sanitizedDiffusions.map((data) =>
            prismaCore.publisherDiffusion.create({
              data,
            })
          )
        );
        diffusionRecordsCreated += sanitizedDiffusions.length;
      }
      diffusionPublishersSynced++;
    } catch (error) {
      console.error(`[MigratePublishers] Failed to sync diffusions for publisher ${annonceurId} (${annonceurName})`, error);
      if (sanitizedDiffusions.length > 0) {
        console.error(
          `[MigratePublishers] Diffusion payload that triggered error for publisher ${annonceurId}:`,
          JSON.stringify(sanitizedDiffusions.slice(0, 5))
        );
      }
      errors++;
    }
  }

  if (pendingDiffusions.length > 0) {
    console.log(
      `[MigratePublishers] Diffusions processed for ${pendingDiffusions.length} publisher(s): synced ${diffusionPublishersSynced} (records created ${diffusionRecordsCreated}), skipped ${diffusionPublishersSkipped}, missing references ${diffusionRecordsMissing}`
    );
  }

  console.log(`[MigratePublishers] Completed. Processed: ${processed}, created: ${created}, updated: ${updated}, errors: ${errors}`);
};

const run = async () => {
  try {
    await migratePublishers();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[MigratePublishers] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

const cleanup = async () => {
  try {
    const { prismaCore } = await import("@/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

run();
