/**
 * Backfill : création/mise à jour des PublisherOrganization à partir des champs organization* de Mission.
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prismaCore } from "@/db/postgres";
type MissingCountRow = { count: number };

const run = async () => {
  const startedAt = new Date();
  console.log(`[PublisherOrganizationBackfill] Started at ${startedAt.toISOString()}`);

  await prismaCore.$connect();

  const publishers = await prismaCore.publisher.findMany({
    where: { isAnnonceur: true },
    select: { id: true },
  });
  const publisherIds = publishers.map((publisher) => publisher.id);

  if (!publisherIds.length) {
    console.log("[PublisherOrganizationBackfill] Aucun publisher annonceur trouvé.");
    return;
  }

  const missingCountRows = await prismaCore.$queryRaw<MissingCountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT ON (m."publisher_id", m."organization_client_id") m."publisher_id", m."organization_client_id"
        FROM "mission" m
        INNER JOIN "publisher" p ON p."id" = m."publisher_id" AND p."is_annonceur" = true
        LEFT JOIN "publisher_organization" po
          ON po."publisher_id" = m."publisher_id"
         AND po."organization_client_id" = m."organization_client_id"
        WHERE m."organization_client_id" IS NOT NULL
          AND m."organization_client_id" <> ''
          AND po."id" IS NULL
        ORDER BY m."publisher_id", m."organization_client_id", m."updated_at" DESC
      ) AS missing
    `
  );
  const missingCount = missingCountRows[0]?.count ?? 0;

  if (!missingCount) {
    console.log("[PublisherOrganizationBackfill] Aucun trou détecté.");
    return;
  }

  console.log(`[PublisherOrganizationBackfill] ${missingCount} organisations manquantes détectées. Insertion en bulk...`);

  const inserted = await prismaCore.$executeRaw(
    Prisma.sql`
      INSERT INTO "publisher_organization" (
        "id",
        "publisher_id",
        "organization_client_id",
        "organization_name",
        "organization_url",
        "organization_type",
        "organization_logo",
        "organization_description",
        "organization_full_address",
        "organization_rna",
        "organization_siren",
        "organization_siret",
        "organization_department",
        "organization_department_code",
        "organization_department_name",
        "organization_post_code",
        "organization_city",
        "organization_status_juridique",
        "organization_beneficiaries",
        "organization_actions",
        "organization_reseaux",
        "organization_name_verified",
        "organization_rna_verified",
        "organization_siren_verified",
        "organization_siret_verified",
        "organization_address_verified",
        "organization_city_verified",
        "organization_postal_code_verified",
        "organization_department_code_verified",
        "organization_department_name_verified",
        "organization_region_verified",
        "organization_verification_status",
        "organisation_is_rup",
        "created_at",
        "updated_at"
      )
      SELECT
        md5(m."publisher_id" || ':' || m."organization_client_id") AS "id",
        m."publisher_id",
        m."organization_client_id",
        NULLIF(TRIM(m."organizationName"), ''),
        NULLIF(TRIM(m."organizationUrl"), ''),
        NULLIF(TRIM(m."organizationType"), ''),
        NULLIF(TRIM(m."organizationLogo"), ''),
        NULLIF(TRIM(m."organizationDescription"), ''),
        NULLIF(TRIM(m."organizationFullAddress"), ''),
        NULLIF(TRIM(m."organizationRNA"), ''),
        NULLIF(TRIM(m."organizationSiren"), ''),
        NULLIF(TRIM(m."organizationSiret"), ''),
        NULLIF(TRIM(m."organizationDepartment"), ''),
        NULLIF(TRIM(m."organizationDepartmentCode"), ''),
        NULLIF(TRIM(m."organizationDepartmentName"), ''),
        NULLIF(TRIM(m."organizationPostCode"), ''),
        NULLIF(TRIM(m."organizationCity"), ''),
        NULLIF(TRIM(m."organizationStatusJuridique"), ''),
        COALESCE(m."organizationBeneficiaries", ARRAY[]::TEXT[]),
        COALESCE(m."organizationActions", ARRAY[]::TEXT[]),
        COALESCE(m."organizationReseaux", ARRAY[]::TEXT[]),
        NULLIF(TRIM(m."organizationNameVerified"), ''),
        NULLIF(TRIM(m."organizationRNAVerified"), ''),
        NULLIF(TRIM(m."organizationSirenVerified"), ''),
        NULLIF(TRIM(m."organizationSiretVerified"), ''),
        NULLIF(TRIM(m."organizationAddressVerified"), ''),
        NULLIF(TRIM(m."organizationCityVerified"), ''),
        NULLIF(TRIM(m."organizationPostalCodeVerified"), ''),
        NULLIF(TRIM(m."organizationDepartmentCodeVerified"), ''),
        NULLIF(TRIM(m."organizationDepartmentNameVerified"), ''),
        NULLIF(TRIM(m."organizationRegionVerified"), ''),
        NULLIF(TRIM(m."organizationVerificationStatus"), ''),
        m."organisationIsRUP",
        COALESCE(m."created_at", CURRENT_TIMESTAMP),
        COALESCE(m."updated_at", CURRENT_TIMESTAMP)
      FROM (
        SELECT DISTINCT ON ("publisher_id", "organization_client_id") *
        FROM "mission"
        WHERE "organization_client_id" IS NOT NULL
          AND "organization_client_id" <> ''
        ORDER BY "publisher_id", "organization_client_id", "updated_at" DESC
      ) AS m
      INNER JOIN "publisher" p ON p."id" = m."publisher_id" AND p."is_annonceur" = true
      LEFT JOIN "publisher_organization" po
        ON po."publisher_id" = m."publisher_id"
       AND po."organization_client_id" = m."organization_client_id"
      WHERE po."id" IS NULL
    `
  );

  console.log(`[PublisherOrganizationBackfill] Insertion terminée (${inserted} lignes).`);

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[PublisherOrganizationBackfill] Terminé en ${(durationMs / 1000).toFixed(1)}s.`);
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
    console.error("[PublisherOrganizationBackfill] Failed:", error);
    await shutdown(1);
  });
