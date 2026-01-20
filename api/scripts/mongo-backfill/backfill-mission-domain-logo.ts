import mongoose from "mongoose";

import { Prisma } from "../../src/db/core";
import { asString, toMongoObjectIdString } from "./utils/cast";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

const SCRIPT_NAME = "BackfillMissionDomainLogo";
const BATCH_SIZE = 500;

const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), SCRIPT_NAME);
loadEnvironment(options, __dirname, SCRIPT_NAME);

type MongoMissionDocument = {
  _id?: { toString(): string } | string;
  id?: unknown;
  domainLogo?: unknown;
};

type DomainLogoEntry = {
  id: string;
  domainLogo: string;
};

const normalizeEntry = (doc: MongoMissionDocument): DomainLogoEntry | null => {
  const id = toMongoObjectIdString(doc._id) ?? asString(doc.id);
  if (!id) {
    return null;
  }
  const domainLogo = asString(doc.domainLogo);
  if (!domainLogo) {
    return null;
  }
  return { id, domainLogo };
};

const flushBatch = async (
  entries: DomainLogoEntry[],
  dryRun: boolean,
  prismaCore: {
    $executeRaw: (query: Prisma.Sql) => Promise<unknown>;
  }
) => {
  if (!entries.length) {
    return 0;
  }

  const unique = new Map<string, string>();
  for (const entry of entries) {
    unique.set(entry.id, entry.domainLogo);
  }

  const payload = Array.from(unique.entries()).map(([id, domainLogo]) => ({ id, domainLogo }));
  if (!payload.length) {
    return 0;
  }

  if (dryRun) {
    return payload.length;
  }

  const rows = await prismaCore.$executeRaw(
    Prisma.sql`
      UPDATE "mission" AS m
      SET "domain_logo" = v.domain_logo
      FROM (
        VALUES ${Prisma.join(payload.map((entry) => Prisma.sql`(${entry.id}, ${entry.domainLogo})`))}
      ) AS v(id, domain_logo)
      WHERE m."id" = v.id
        AND (m."domain_logo" IS NULL OR m."domain_logo" = '')
    `
  );

  return Number(rows ?? 0);
};

const cleanup = async () => {
  try {
    const { prismaCore } = await import("../../src/db/postgres");
    await Promise.allSettled([prismaCore.$disconnect(), mongoose.connection.close()]);
  } catch {
    await Promise.allSettled([mongoose.connection.close()]);
  }
};

const main = async () => {
  console.log(`[${SCRIPT_NAME}] Starting${options.dryRun ? " (dry-run)" : ""}`);
  const [{ mongoConnected }, { pgConnected, prismaCore }] = await Promise.all([import("../../src/db/mongo"), import("../../src/db/postgres")]);
  await Promise.all([mongoConnected, pgConnected]);

  const collection = mongoose.connection.collection("missions");
  const filter = { domainLogo: { $exists: true, $nin: [null, ""] } };
  const total = await collection.countDocuments(filter);
  console.log(`[${SCRIPT_NAME}] Found ${total} mission(s) with domainLogo in MongoDB`);

  if (!total) {
    return;
  }

  const cursor = collection
    .find(filter, { batchSize: BATCH_SIZE, projection: { _id: 1, id: 1, domainLogo: 1 } })
    .sort({ _id: 1 });

  const stats = { processed: 0, withLogo: 0, skipped: 0, updated: 0, wouldUpdate: 0 };
  let batch: DomainLogoEntry[] = [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoMissionDocument;
    stats.processed += 1;
    const normalized = normalizeEntry(doc);
    if (!normalized) {
      stats.skipped += 1;
      continue;
    }
    stats.withLogo += 1;
    batch.push(normalized);

    if (batch.length >= BATCH_SIZE) {
      const count = await flushBatch(batch, options.dryRun, prismaCore);
      if (options.dryRun) {
        stats.wouldUpdate += count;
      } else {
        stats.updated += count;
      }
      console.log(`[${SCRIPT_NAME}] Processed ${stats.processed}/${total}`);
      batch = [];
    }
  }

  if (batch.length) {
    const count = await flushBatch(batch, options.dryRun, prismaCore);
    if (options.dryRun) {
      stats.wouldUpdate += count;
    } else {
      stats.updated += count;
    }
  }

  console.log(
    `[${SCRIPT_NAME}] Done. Processed: ${stats.processed}, with logo: ${stats.withLogo}, skipped: ${stats.skipped}, ${
      options.dryRun ? `would update: ${stats.wouldUpdate}` : `updated: ${stats.updated}`
    }`
  );
};

main()
  .catch((error) => {
    console.error(`[${SCRIPT_NAME}] Error`, error);
    process.exit(1);
  })
  .finally(cleanup);
