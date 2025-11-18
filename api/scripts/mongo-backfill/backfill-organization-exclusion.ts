import mongoose from "mongoose";

import type { OrganizationExclusionCreateInput } from "../../src/types/organization-exclusion";
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

const normalizeOrganizationExclusion = (doc: MongoOrganizationExclusionDocument): OrganizationExclusionCreateInput | null => {
  const excludedByAnnonceurId = asString(doc.excludedByPublisherId);
  if (!excludedByAnnonceurId) {
    console.warn("[MigrateOrganizationExclusions] Skipping document without excludedByPublisherId");
    return null;
  }

  const excludedForDiffuseurId = asString(doc.excludedForPublisherId);
  if (!excludedForDiffuseurId) {
    console.warn("[MigrateOrganizationExclusions] Skipping document without excludedForPublisherId");
    return null;
  }

  const organizationClientId = asString(doc.organizationClientId);

  return {
    excludedByAnnonceurId,
    excludedForDiffuseurId,
    organizationClientId: organizationClientId ?? null,
    organizationName: asString(doc.organizationName) ?? null,
  };
};

const migrateOrganizationExclusions = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }, { organizationExclusionService }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/services/organization-exclusion"),
  ]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateOrganizationExclusions] Starting migration");

  const collection = mongoose.connection.collection("organization-exclusion");
  const total = await collection.countDocuments();
  console.log(`[MigrateOrganizationExclusions] Found ${total} organization exclusion document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const batch: OrganizationExclusionCreateInput[] = [];

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
        const count = await organizationExclusionService.createManyExclusions(batch);
        created += count;
      }
      batch.length = 0;
    } catch (error) {
      errors += batch.length;
      console.error("[MigrateOrganizationExclusions] Failed to create batch of exclusions", error);
      batch.length = 0;
    }
  };

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoOrganizationExclusionDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeOrganizationExclusion(doc);
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
      const { prismaCore } = await import("../../src/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
