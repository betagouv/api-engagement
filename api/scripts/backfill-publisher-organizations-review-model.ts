/**
 * Backfill : liaison des missions aux publisher_organization via publisher_organization_id.
 *
 * Les champs publisher_organization ont été renommés directement dans la migration
 * (organization_client_id -> client_id, etc.). Ce script ne fait que lier les missions
 * à leur publisher_organization correspondante.
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-review-model.ts
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-review-model.ts --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../src/db/postgres";

const DRY_RUN = process.argv.includes("--dry-run");

const migrateMissions = async () => {
  const publisherOrganizations = await prismaCore.publisherOrganization.findMany({
    where: {},
    select: {
      id: true,
      clientId: true,
      publisherId: true,
    },
  });
  console.log(`[PublisherOrganizationReviewModelBackfill] ${publisherOrganizations.length} publisher organizations found`);

  let updatedMissionsCount = 0;
  let processedPublisherOrganizationsCount = 0;
  for (const publisherOrganization of publisherOrganizations) {
    const missionsCount = await prismaCore.mission.count({
      where: {
        organizationClientId: publisherOrganization.clientId,
        publisherOrganizationId: null,
      },
    });

    if (missionsCount === 0) {
      continue;
    }

    if (!DRY_RUN) {
      const updatedMissions = await prismaCore.mission.updateMany({
        where: {
          publisherId: publisherOrganization.publisherId,
          organizationClientId: publisherOrganization.clientId,
          publisherOrganizationId: null,
        },
        data: {
          publisherOrganizationId: publisherOrganization.id,
        },
      });
      updatedMissionsCount += updatedMissions.count ?? 0;
    } else {
      updatedMissionsCount += missionsCount;
    }
    processedPublisherOrganizationsCount++;

    if (processedPublisherOrganizationsCount % 100 === 0) {
      console.log(
        `[PublisherOrganizationReviewModelBackfill] Processed ${processedPublisherOrganizationsCount} publisher organizations${DRY_RUN ? " (dry-run)" : ""}, ${updatedMissionsCount} missions ${DRY_RUN ? "would be" : ""} updated`
      );
    }
  }
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

const main = async () => {
  await prismaCore.$connect();
  console.log("[PublisherOrganizationReviewModelBackfill] Connected to PostgreSQL");
  await migrateMissions();
};

main()
  .then(async () => {
    console.log("[PublisherOrganizationReviewModelBackfill] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[PublisherOrganizationReviewModelBackfill] Failed:", error);
    await shutdown(1);
  });
