import mongoose from "mongoose";

import { PublisherRecord } from "@/types";
import type { PublisherDiffusionExclusionCreateInput } from "@/types/publisher-diffusion-exclusion";
import { asString } from "./utils/cast";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

type MongoOrganizationExclusionDocument = {
  _id?: { toString(): string } | string;
  excludedByPublisherId?: unknown;
  excludedByPublisherName?: unknown;
  excludedForPublisherId?: unknown;
  excludedForPublisherName?: unknown;
  organizationClientId?: unknown;
  organizationName?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const BATCH_SIZE = 500;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateOrganizationExclusions");
loadEnvironment(options, __dirname, "MigrateOrganizationExclusions");

const normalizeOrganizationExclusion = (doc: MongoOrganizationExclusionDocument, publishers: PublisherRecord[]): PublisherDiffusionExclusionCreateInput | null => {
  const excludedByAnnonceur = publishers.find((p) => p.id === asString(doc.excludedByPublisherId));
  if (!excludedByAnnonceur) {
    console.warn(`[MigrateOrganizationExclusions] Skipping document without excludedByPublisherId: ${asString(doc.excludedByPublisherId)}`);
    return null;
  }
  const excludedForDiffuseur = publishers.find((p) => p.id === asString(doc.excludedForPublisherId));
  if (!excludedForDiffuseur) {
    console.warn(`[MigrateOrganizationExclusions] Skipping document without excludedForPublisherId: ${asString(doc.excludedForPublisherId)}`);
    return null;
  }

  const organizationClientId = asString(doc.organizationClientId);

  return {
    excludedByAnnonceurId: excludedByAnnonceur.id,
    excludedForDiffuseurId: excludedForDiffuseur.id,
    organizationClientId: organizationClientId ?? null,
    organizationName: asString(doc.organizationName) ?? null,
  };
};

const migrateOrganizationExclusions = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }, { publisherDiffusionExclusionService }, { publisherService }] = await Promise.all([
    import("@/db/mongo"),
    import("@/db/postgres"),
    import("@/services/publisher-diffusion-exclusion"),
    import("@/services/publisher"),
  ]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateOrganizationExclusions] Starting migration");

  const collection = mongoose.connection.collection("organization-exclusions");
  const total = await collection.countDocuments();
  console.log(`[MigrateOrganizationExclusions] Found ${total} organization exclusion document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const batch: PublisherDiffusionExclusionCreateInput[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }

    try {
      if (options.dryRun) {
        console.log(`[MigrateOrganizationExclusions][Dry-run] Would create ${batch.length} exclusion(s)`);
        batch.forEach((exclusion) => {
          console.log(
            `  - excludedByAnnonceurId: ${exclusion.excludedByAnnonceurId}, excludedForDiffuseurId: ${exclusion.excludedForDiffuseurId}, organizationClientId: ${exclusion.organizationClientId ?? "null"}`
          );
        });
        created += batch.length;
      } else {
        const count = await publisherDiffusionExclusionService.createManyExclusions(batch);
        created += count;
      }
      batch.length = 0;
    } catch (error) {
      errors += batch.length;
      console.error("[MigrateOrganizationExclusions] Failed to create batch of exclusions", error);
      batch.length = 0;
    }
  };

  const publishers = await publisherService.findPublishers();

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoOrganizationExclusionDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeOrganizationExclusion(doc, publishers);
      if (!normalized) {
        skipped++;
        processed++;
        continue;
      }

      if (options.dryRun) {
        batch.push(normalized);
        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
        }
      } else {
        batch.push(normalized);
        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
        }
      }

      processed++;

      if (processed % BATCH_SIZE === 0) {
        await flushBatch();
        console.log(`[MigrateOrganizationExclusions] Processed ${processed}/${total} (created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun})`);
      }
    } catch (error) {
      errors++;
      console.error("[MigrateOrganizationExclusions] Failed to process document", error);
      processed++;
    }
  }

  // Flush remaining batch
  await flushBatch();

  console.log(`[MigrateOrganizationExclusions] Completed. Processed: ${processed}, created: ${created}, skipped: ${skipped}, errors: ${errors}, dry-run: ${options.dryRun}`);

  await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
};

migrateOrganizationExclusions()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[MigrateOrganizationExclusions] Unexpected error:", error);
    try {
      const { prismaCore } = await import("@/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
