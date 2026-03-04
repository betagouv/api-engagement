/**
 * Backfill : renseigne publisher_organization_id sur PublisherDiffusionExclusion
 * à partir de organization_client_id (via la correspondance avec PublisherOrganization).
 *
 * Correspondance : excluded_by_annonceur_id = po.publisher_id ET organization_client_id = po.client_id
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-exclusion.ts
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-exclusion.ts --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "@/db/postgres";
import publisherOrganizationService from "@/services/publisher-organization";

const isDryRun = process.argv.includes("--dry-run");

const run = async () => {
  const startedAt = new Date();
  console.log(`[PublisherDiffusionExclusionBackfill] Started at ${startedAt.toISOString()}${isDryRun ? " (dry-run)" : ""}`);

  await prismaCore.$connect();

  let updated = 0;
  let notFound = 0;

  const exclusions = await prismaCore.publisherDiffusionExclusion.groupBy({
    where: { publisherOrganizationId: null, organizationClientId: { not: null } },
    by: ["excludedByAnnonceurId", "organizationClientId"],
    _count: true,
  });

  for (const exclusion of exclusions) {
    const { excludedByAnnonceurId, organizationClientId, _count } = exclusion;

    if (!excludedByAnnonceurId || !organizationClientId) {
      continue;
    }
    console.log(
      `[PublisherDiffusionExclusionBackfill] Processing exclusion ${exclusion.excludedByAnnonceurId} for organization ${exclusion.organizationClientId} (${_count} exclusions)`
    );

    const organizationName = await prismaCore.publisherDiffusionExclusion.findFirst({
      where: { excludedByAnnonceurId, organizationClientId, organizationName: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { organizationName: true },
    });

    const publisherOrg = await publisherOrganizationService.findUniqueOrCreate(organizationClientId, excludedByAnnonceurId, { name: organizationName?.organizationName });

    if (!isDryRun) {
      const result = await prismaCore.publisherDiffusionExclusion.updateMany({
        where: { excludedByAnnonceurId, organizationClientId },
        data: { publisherOrganizationId: publisherOrg.id },
      });
      updated += result.count ?? 0;
      console.log(`[PublisherDiffusionExclusionBackfill] Updated ${result.count ?? 0} exclusions for publisher organization ${publisherOrg.id}`);
    } else {
      const count = await prismaCore.publisherDiffusionExclusion.count({
        where: { excludedByAnnonceurId, organizationClientId },
      });
      console.log(`[PublisherDiffusionExclusionBackfill] Would update ${count} exclusions for publisher organization ${publisherOrg.id}`);
    }
  }

  console.log(`[PublisherDiffusionExclusionBackfill] Résumé:`);
  console.log(`  - Mises à jour: ${updated}${isDryRun ? " (non appliquées en dry-run)" : ""}`);
  if (notFound > 0) {
    console.warn(`  - Organisation non trouvée ou organizationClientId vide (restent à publisher_organization_id null): ${notFound}`);
  }

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[PublisherDiffusionExclusionBackfill] Terminé en ${(durationMs / 1000).toFixed(1)}s.`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[PublisherDiffusionExclusionBackfill] Failed:", error);
    await shutdown(1);
  });
