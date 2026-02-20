import mongoose from "mongoose";

import { statBotService } from "@/services/stat-bot";
import type { StatBotCreateInput } from "@/types/stat-bot";
import { asString, toMongoObjectIdString } from "./utils/cast";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

type MongoStatsBotDocument = {
  _id?: { toString(): string } | string;
  origin?: unknown;
  referer?: unknown;
  userAgent?: unknown;
  host?: unknown;
  user?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const BATCH_SIZE = 500;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateStatsBots");
loadEnvironment(options, __dirname, "MigrateStatsBots");

const normalizeStatsBot = (doc: MongoStatsBotDocument): StatBotCreateInput | null => {
  const user = asString(doc.user);
  if (!user) {
    console.warn(`[MigrateStatsBots] Skipping document due to missing user: ${toMongoObjectIdString(doc._id)}`);
    return null;
  }

  return {
    user,
    origin: asString(doc.origin),
    referer: asString(doc.referer),
    userAgent: asString(doc.userAgent),
    host: asString(doc.host),
  };
};

const migrateStatsBots = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("@/db/mongo"), import("@/db/postgres")]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateStatsBots] Starting migration");

  const collection = mongoose.connection.collection("stats-bots"); // Note: MongoDB collection name is often pluralized
  const total = await collection.countDocuments();
  console.log(`[MigrateStatsBots] Found ${total} stats bot document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoStatsBotDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeStatsBot(doc);
      if (!normalized) {
        skipped++;
        processed++;
        continue;
      }

      if (options.dryRun) {
        const existing = await statBotService.findStatBotByUser(normalized.user);
        if (existing) {
          console.log(`[MigrateStatsBots][Dry-run] Would update stats bot for user: ${normalized.user}`);
        } else {
          console.log(`[MigrateStatsBots][Dry-run] Would create stats bot for user: ${normalized.user}`);
        }
        created++;
      } else {
        let updated = false;
        const existing = await statBotService.findStatBotByUser(normalized.user);
        if (existing) {
          await statBotService.updateStatBot(normalized.user, normalized);
          updated = true;
          created++;
          console.log(`[MigrateStatsBots] Updated stats bot for user: ${normalized.user}`);
        }

        if (!updated) {
          try {
            await statBotService.createStatBot(normalized);
            created++;
          } catch (error: any) {
            if (error.message?.includes("already exists")) {
              // Try to find and update as fallback
              const existing = await statBotService.findStatBotByUser(normalized.user);
              if (existing) {
                await statBotService.updateStatBot(normalized.user, normalized);
                created++;
                console.log(`[MigrateStatsBots] Updated existing stats bot for user: ${normalized.user}`);
              } else {
                skipped++;
                console.log(`[MigrateStatsBots] Skipping duplicate stats bot for user: ${normalized.user}`);
              }
            } else {
              throw error;
            }
          }
        }
      }

      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[MigrateStatsBots] Processed ${processed}/${total} (created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun})`);
      }
    } catch (error) {
      errors++;
      console.error(`[MigrateStatsBots] Failed to migrate stats bot document ${toMongoObjectIdString(doc._id)}`, error);
      processed++;
    }
  }

  console.log(`[MigrateStatsBots] Completed. Processed: ${processed}, created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun}`);

  await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
};

migrateStatsBots()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[MigrateStatsBots] Unexpected error:", error);
    try {
      const { prismaCore } = await import("@/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
