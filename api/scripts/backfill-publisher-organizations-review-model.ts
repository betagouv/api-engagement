/**
 * Backfill : migration des champs legacy vers les nouveaux champs du modèle PublisherOrganization.
 *
 * Mapping des champs :
 *   - organizationName          -> name
 *   - organizationRNA           -> rna
 *   - organizationSiren         -> siren
 *   - organizationUrl           -> url
 *   - organizationLogo          -> logo
 *   - organizationDescription   -> description
 *   - organizationStatusJuridique -> legalStatus
 *   - organizationType          -> type
 *   - organizationActions       -> actions
 *   - organizationFullAddress   -> fullAddress
 *   - organizationPostCode      -> postalCode
 *   - organizationCity          -> city
 *   - organizationBeneficiaries -> beneficiaries
 *   - organizationReseaux       -> parentOrganizations
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-review-model.ts
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations-review-model.ts --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../src/db/postgres";

const DRY_RUN = process.argv.includes("--dry-run");

type CountResult = { count: bigint }[];

const reviewPublisherOrganizationModel = async () => {
  const startedAt = new Date();
  console.log(`[PublisherOrganizationReviewModelBackfill] Started at ${startedAt.toISOString()}`);

  await prismaCore.$connect();
  console.log("[PublisherOrganizationReviewModelBackfill] Connected to PostgreSQL");

  // Compter le nombre total d'organisations à migrer (celles qui n'ont pas encore été migrées)
  // On considère qu'une organisation est "migrée" si le champ `name` est renseigné
  const countResult = await prismaCore.$queryRaw<CountResult>`
    SELECT COUNT(*) as count
    FROM "publisher_organization"
    WHERE "client_id" IS NULL
  `;

  const totalCount = Number(countResult[0]?.count ?? 0);

  console.log(`[PublisherOrganizationReviewModelBackfill] ${totalCount} organisations à migrer`);

  if (totalCount === 0) {
    console.log("[PublisherOrganizationReviewModelBackfill] Aucune organisation à migrer.");
    return;
  }

  // Migration en une seule requête UPDATE
  const migratedCount = await prismaCore.$executeRaw`
    UPDATE "publisher_organization"
    SET
      "client_id" = "organization_client_id",
      "name" = "organization_name",
      "rna" = "organization_rna",
      "siren" = "organization_siren",
      "url" = "organization_url",
      "logo" = "organization_logo",
      "description" = "organization_description",
      "legal_status" = "organization_status_juridique",
      "type" = "organization_type",
      "actions" = "organization_actions",
      "full_address" = "organization_full_address",
      "postal_code" = "organization_post_code",
      "city" = "organization_city",
      "beneficiaries" = "organization_beneficiaries",
      "parent_organizations" = "organization_reseaux",
      "updated_at" = NOW()
    WHERE "client_id" IS NULL
  `;

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[PublisherOrganizationReviewModelBackfill] Migration terminée : ${migratedCount} organisations migrées en ${(durationMs / 1000).toFixed(1)}s.`);

  // Migrate missions
};

const migrateMissions = async () => {
  const publisherOrganizations = await prismaCore.publisherOrganization.findMany({
    where: {},
    select: {
      id: true,
      clientId: true,
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

    if (missionsCount === 0 && DRY_RUN) {
      continue;
    }
    const updatedMissions = await prismaCore.mission.updateMany({
      where: {
        organizationClientId: publisherOrganization.clientId,
        publisherOrganizationId: null,
      },
      data: {
        publisherOrganizationId: publisherOrganization.id,
      },
    });
    processedPublisherOrganizationsCount++;
    updatedMissionsCount += updatedMissions.count ?? 0;

    if (processedPublisherOrganizationsCount % 100 === 0) {
      console.log(
        `[PublisherOrganizationReviewModelBackfill] Processed ${processedPublisherOrganizationsCount} publisher organizations and updated ${updatedMissionsCount} missions`
      );
    }

    if (processedPublisherOrganizationsCount % 100 === 0) {
      console.log(
        `[PublisherOrganizationReviewModelBackfill] Processed ${processedPublisherOrganizationsCount} publisher organizations and updated ${updatedMissionsCount} missions`
      );
    }
  }
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

const main = async () => {
  await reviewPublisherOrganizationModel();
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
