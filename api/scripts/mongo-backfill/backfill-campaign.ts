import mongoose from "mongoose";

import { Prisma } from "../../src/db/core";
import type { CampaignType } from "../../src/types/campaign";
import { asBoolean, asDate, asString, toMongoObjectIdString } from "./utils/cast";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

type MongoCampaignDocument = {
  _id?: { toString(): string } | string;
  name?: unknown;
  type?: unknown;
  url?: unknown;
  trackers?: unknown;
  fromPublisherId?: unknown;
  fromPublisherName?: unknown;
  toPublisherId?: unknown;
  toPublisherName?: unknown;
  active?: unknown;
  deletedAt?: unknown;
  reassignedAt?: unknown;
  reassignedByUsername?: unknown;
  reassignedByUserId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const BATCH_SIZE = 100;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateCampaigns");
loadEnvironment(options, __dirname, "MigrateCampaigns");

const mapCampaignType = (type: string | null | undefined): CampaignType => {
  if (!type) {
    return "OTHER";
  }
  const normalized = String(type).trim();
  switch (normalized) {
    case "banniere/publicité":
      return "AD_BANNER";
    case "mailing":
      return "MAILING";
    case "tuile/bouton":
      return "TILE_BUTTON";
    case "autre":
      return "OTHER";
    default:
      return "OTHER";
  }
};

const normalizeTrackers = (trackers: unknown): Array<{ key: string; value: string }> => {
  if (!Array.isArray(trackers)) {
    return [];
  }
  const result: Array<{ key: string; value: string }> = [];
  for (const tracker of trackers) {
    if (tracker && typeof tracker === "object" && "key" in tracker && "value" in tracker) {
      const key = asString(tracker.key);
      const value = asString(tracker.value);
      if (key && value) {
        result.push({ key, value });
      }
    }
  }
  return result;
};

const normalizeCampaign = (doc: MongoCampaignDocument): Prisma.CampaignCreateInput | null => {
  const name = asString(doc.name);
  if (!name) {
    console.warn("[MigrateCampaigns] Skipping document without name");
    return null;
  }

  const url = asString(doc.url);
  if (!url) {
    console.warn("[MigrateCampaigns] Skipping document without url");
    return null;
  }

  const fromPublisherId = asString(doc.fromPublisherId);
  if (!fromPublisherId) {
    console.warn("[MigrateCampaigns] Skipping document without fromPublisherId");
    return null;
  }

  const toPublisherId = asString(doc.toPublisherId);
  if (!toPublisherId) {
    console.warn("[MigrateCampaigns] Skipping document without toPublisherId");
    return null;
  }

  const type = mapCampaignType(asString(doc.type));
  const trackers = normalizeTrackers(doc.trackers);
  const active = asBoolean(doc.active, true);
  const deletedAt = asDate(doc.deletedAt);

  // Skip deleted campaigns
  if (deletedAt) {
    return null;
  }

  return {
    id: toMongoObjectIdString(doc._id),
    name,
    type,
    url,
    fromPublisherId,
    toPublisherId,
    trackers,
    active,
  };
};

const migrateCampaigns = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }, { campaignService }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/services/campaign"),
  ]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateCampaigns] Starting migration");

  const collection = mongoose.connection.collection("campaign");
  const total = await collection.countDocuments();
  console.log(`[MigrateCampaigns] Found ${total} campaign document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoCampaignDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeCampaign(doc);
      if (!normalized) {
        skipped++;
        processed++;
        continue;
      }

      if (options.dryRun) {
        console.log(`[MigrateCampaigns][Dry-run] Would create campaign: ${normalized.name} (${normalized.fromPublisherId} -> ${normalized.toPublisherId})`);
        created++;
      } else {
        try {
          await campaignService.createCampaign(normalized);
          created++;
        } catch (error: any) {
          if (error.message?.includes("already exists")) {
            skipped++;
            console.log(`[MigrateCampaigns] Skipping duplicate campaign: ${normalized.name} for publisher ${normalized.fromPublisherId}`);
          } else {
            throw error;
          }
        }
      }

      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[MigrateCampaigns] Processed ${processed}/${total} (created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun})`);
      }
    } catch (error) {
      errors++;
      console.error("[MigrateCampaigns] Failed to process document", error);
      processed++;
    }
  }

  console.log(`[MigrateCampaigns] Completed. Processed: ${processed}, created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun}`);

  await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
};

migrateCampaigns()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[MigrateCampaigns] Unexpected error:", error);
    try {
      const { prismaCore } = await import("../../src/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
