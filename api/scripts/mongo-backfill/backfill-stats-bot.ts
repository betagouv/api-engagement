import mongoose from "mongoose";

import { statsBotService } from "../../src/services/stats-bot";
import type { StatsBotCreateInput } from "../../src/types/stats-bot";
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

const normalizeStatsBot = (doc: MongoStatsBotDocument): StatsBotCreateInput | null => {
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
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);

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
        console.log(`[MigrateStatsBots][Dry-run] Would create stats bot for user: ${normalized.user}`);
        created++;
      } else {
        try {
          await statsBotService.createStatsBot(normalized);
          created++;
        } catch (error: any) {
          if (error.message?.includes("already exists")) {
            skipped++;
            console.log(`[MigrateStatsBots] Skipping duplicate stats bot for user: ${normalized.user}`);
          } else {
            throw error;
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
      const { prismaCore } = await import("../../src/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
