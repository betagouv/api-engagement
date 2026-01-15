/**
 * Backfill : création/mise à jour des PublisherOrganization à partir des champs organization* de Mission.
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/backfill-publisher-organizations.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "../src/db/core";
import { prismaCore } from "../src/db/postgres";
import { publisherOrganizationRepository } from "../src/repositories/publisher-organization";
import { normalizeOptionalString, normalizeStringList } from "../src/utils/normalize";

const BATCH_SIZE = 500;

type MissionOrganizationRow = {
  id: string;
  publisherId: string;
  organizationClientId: string | null;
  organizationName: string | null;
  organizationUrl: string | null;
  organizationType: string | null;
  organizationLogo: string | null;
  organizationDescription: string | null;
  organizationFullAddress: string | null;
  organizationRNA: string | null;
  organizationSiren: string | null;
  organizationSiret: string | null;
  organizationDepartment: string | null;
  organizationDepartmentCode: string | null;
  organizationDepartmentName: string | null;
  organizationPostCode: string | null;
  organizationCity: string | null;
  organizationStatusJuridique: string | null;
  organizationBeneficiaries: string[] | null;
  organizationActions: string[] | null;
  organizationReseaux: string[] | null;
  organizationNameVerified: string | null;
  organizationRNAVerified: string | null;
  organizationSirenVerified: string | null;
  organizationSiretVerified: string | null;
  organizationAddressVerified: string | null;
  organizationCityVerified: string | null;
  organizationPostalCodeVerified: string | null;
  organizationDepartmentCodeVerified: string | null;
  organizationDepartmentNameVerified: string | null;
  organizationRegionVerified: string | null;
  organizationVerificationStatus: string | null;
  organisationIsRUP: boolean | null;
};

const fetchMissionOrganizationRows = async (publisherIds: string[], afterId?: string | null): Promise<MissionOrganizationRow[]> => {
  if (!publisherIds.length) {
    return [];
  }

  return prismaCore.$queryRaw<MissionOrganizationRow[]>(
    Prisma.sql`
      SELECT
        id,
        "publisher_id" AS "publisherId",
        "organization_client_id" AS "organizationClientId",
        "organizationUrl",
        "organizationName",
        "organizationType",
        "organizationLogo",
        "organizationDescription",
        "organizationFullAddress",
        "organizationRNA",
        "organizationSiren",
        "organizationSiret",
        "organizationDepartment",
        "organizationDepartmentCode",
        "organizationDepartmentName",
        "organizationPostCode",
        "organizationCity",
        "organizationStatusJuridique",
        "organizationBeneficiaries",
        "organizationActions",
        "organizationReseaux",
        "organizationNameVerified",
        "organizationRNAVerified",
        "organizationSirenVerified",
        "organizationSiretVerified",
        "organizationAddressVerified",
        "organizationCityVerified",
        "organizationPostalCodeVerified",
        "organizationDepartmentCodeVerified",
        "organizationDepartmentNameVerified",
        "organizationRegionVerified",
        "organizationVerificationStatus",
        "organisationIsRUP"
      FROM mission
      WHERE "publisher_id" IN (${Prisma.join(publisherIds)})
      ${afterId ? Prisma.sql`AND id > ${afterId}` : Prisma.empty}
      ORDER BY id ASC
      LIMIT ${BATCH_SIZE}
    `
  );
};

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

  let processed = 0;
  let upserted = 0;
  let skipped = 0;
  let errors = 0;
  let lastId: string | null = null;

  while (true) {
    const rows = await fetchMissionOrganizationRows(publisherIds, lastId);
    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      processed += 1;

      const organizationClientId = normalizeOptionalString(row.organizationClientId ?? undefined);
      if (!organizationClientId) {
        skipped += 1;
        continue;
      }

      try {
        const payload = {
          organizationClientId,
          organizationName: normalizeOptionalString(row.organizationName ?? undefined),
          organizationUrl: normalizeOptionalString(row.organizationUrl ?? undefined),
          organizationType: normalizeOptionalString(row.organizationType ?? undefined),
          organizationLogo: normalizeOptionalString(row.organizationLogo ?? undefined),
          organizationDescription: normalizeOptionalString(row.organizationDescription ?? undefined),
          organizationFullAddress: normalizeOptionalString(row.organizationFullAddress ?? undefined),
          organizationRNA: normalizeOptionalString(row.organizationRNA ?? undefined),
          organizationSiren: normalizeOptionalString(row.organizationSiren ?? undefined),
          organizationSiret: normalizeOptionalString(row.organizationSiret ?? undefined),
          organizationDepartment: normalizeOptionalString(row.organizationDepartment ?? undefined),
          organizationDepartmentCode: normalizeOptionalString(row.organizationDepartmentCode ?? undefined),
          organizationDepartmentName: normalizeOptionalString(row.organizationDepartmentName ?? undefined),
          organizationPostCode: normalizeOptionalString(row.organizationPostCode ?? undefined),
          organizationCity: normalizeOptionalString(row.organizationCity ?? undefined),
          organizationStatusJuridique: normalizeOptionalString(row.organizationStatusJuridique ?? undefined),
          organizationBeneficiaries: normalizeStringList(row.organizationBeneficiaries ?? []),
          organizationActions: normalizeStringList(row.organizationActions ?? []),
          organizationReseaux: normalizeStringList(row.organizationReseaux ?? []),
          organizationNameVerified: normalizeOptionalString(row.organizationNameVerified ?? undefined),
          organizationRNAVerified: normalizeOptionalString(row.organizationRNAVerified ?? undefined),
          organizationSirenVerified: normalizeOptionalString(row.organizationSirenVerified ?? undefined),
          organizationSiretVerified: normalizeOptionalString(row.organizationSiretVerified ?? undefined),
          organizationAddressVerified: normalizeOptionalString(row.organizationAddressVerified ?? undefined),
          organizationCityVerified: normalizeOptionalString(row.organizationCityVerified ?? undefined),
          organizationPostalCodeVerified: normalizeOptionalString(row.organizationPostalCodeVerified ?? undefined),
          organizationDepartmentCodeVerified: normalizeOptionalString(row.organizationDepartmentCodeVerified ?? undefined),
          organizationDepartmentNameVerified: normalizeOptionalString(row.organizationDepartmentNameVerified ?? undefined),
          organizationRegionVerified: normalizeOptionalString(row.organizationRegionVerified ?? undefined),
          organizationVerificationStatus: normalizeOptionalString(row.organizationVerificationStatus ?? undefined),
          organisationIsRUP: row.organisationIsRUP ?? undefined,
        };

        const { organizationClientId: _, ...update } = payload;
        await publisherOrganizationRepository.upsertByPublisherAndClientId({
          publisherId: row.publisherId,
          organizationClientId,
          create: {
            publisher: { connect: { id: row.publisherId } },
            ...payload,
          },
          update,
        });

        upserted += 1;
      } catch (error) {
        errors += 1;
        console.error(`[PublisherOrganizationBackfill] Erreur sur mission ${row.id}:`, error);
      }
    }

    lastId = rows[rows.length - 1]?.id ?? lastId;
    console.log(`[PublisherOrganizationBackfill] Progression: ${processed} missions, ${upserted} upserts, ${skipped} ignorées, ${errors} erreurs.`);
  }

  const durationMs = Date.now() - startedAt.getTime();
  console.log(`[PublisherOrganizationBackfill] Terminé en ${(durationMs / 1000).toFixed(1)}s.`);
  console.log(`[PublisherOrganizationBackfill] Total: ${processed} missions, ${upserted} upserts, ${skipped} ignorées, ${errors} erreurs.`);
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
