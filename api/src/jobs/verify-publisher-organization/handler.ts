import { ORGANIZATION_VERIFICATION_STATUS } from "../../constants/organization-verification";
import { captureException } from "../../error";
import publisherOrganizationService from "../../services/publisher-organization";
import { normalizeName, normalizeRNA, normalizeSiret } from "../../utils";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { findByName, findByRNA, findBySiret, updatePublisherOrganization } from "./utils/organization";

const CHUNK_SIZE = 500;

export interface VerifyPublisherOrganizationJobPayload {
  publisherId?: string;
  limit?: number;
  dryRun?: boolean;
}

export interface VerificationResult {
  processed: number;
  verified: number;
  rnaVerified: number;
  siretVerified: number;
  nameVerified: number;
  rnaNotFound: number;
  siretNotFound: number;
  nameNotFound: number;
  noIdentifier: number;
}

export interface VerifyPublisherOrganizationJobResult extends JobResult {
  start: Date;
  end: Date;
  result: VerificationResult;
}

export class VerifyPublisherOrganizationHandler implements BaseHandler<VerifyPublisherOrganizationJobPayload, VerifyPublisherOrganizationJobResult> {
  name = "Vérification des organisations des éditeurs";

  async handle(payload: VerifyPublisherOrganizationJobPayload): Promise<VerifyPublisherOrganizationJobResult> {
    const start = new Date();
    console.log(`[VerifyPublisherOrganization] Starting at ${start.toISOString()}`);

    const { publisherId, limit, dryRun = false } = payload;

    if (dryRun) {
      console.log(`[VerifyPublisherOrganization] Running in dry-run mode - no updates will be made`);
    }

    const result: VerificationResult = {
      processed: 0,
      verified: 0,
      rnaVerified: 0,
      siretVerified: 0,
      nameVerified: 0,
      rnaNotFound: 0,
      siretNotFound: 0,
      nameNotFound: 0,
      noIdentifier: 0,
    };

    try {
      // Count total unverified
      const totalUnverified = await publisherOrganizationService.count({ publisherId, verifiedAt: null });
      console.log(`[VerifyPublisherOrganization] Found ${totalUnverified} unverified publisher organizations`);

      if (totalUnverified === 0) {
        console.log(`[VerifyPublisherOrganization] No unverified organizations to process`);
        return {
          success: true,
          timestamp: new Date(),
          message: "No unverified organizations to process",
          start,
          end: new Date(),
          result,
        };
      }

      for (let i = 0; i < totalUnverified; i += CHUNK_SIZE) {
        const chunk = await publisherOrganizationService.findMany(
          {
            publisherId,
            verifiedAt: null,
          },
          {
            take: CHUNK_SIZE,
            skip: i,
          }
        );

        if (chunk.length === 0) {
          break;
        }
        result.processed += chunk.length;

        console.log(`[VerifyPublisherOrganization] Processing batch of ${chunk.length} organizations (${i + 1}-${i + chunk.length}/${totalUnverified})`);

        for (const organization of chunk) {
          try {
            // Check if organization has any identifier to verify
            const rna = normalizeRNA(organization.rna);
            const siret = normalizeSiret(organization.siret);
            const name = normalizeName(organization.name);

            if (!rna && !siret && !name) {
              result.noIdentifier++;
              await updatePublisherOrganization(organization.id, null, ORGANIZATION_VERIFICATION_STATUS.NO_DATA);
              continue;
            }
            if (rna) {
              const res = await findByRNA(rna);
              if (res) {
                result.rnaVerified++;
                const status =
                  res.source === "DATA_SUBVENTION" ? ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_SUBVENTION : ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_DB;
                await updatePublisherOrganization(organization.id, res, status);
                continue;
              }
            }

            if (siret) {
              const res = await findBySiret(siret);
              if (res) {
                result.siretVerified++;
                const status =
                  res.source === "DATA_SUBVENTION"
                    ? ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_SUBVENTION
                    : ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_DB;
                await updatePublisherOrganization(organization.id, res, status);
                continue;
              }
            }

            if (name) {
              const res = await findByName(name);
              if (res) {
                result.nameVerified++;
                await updatePublisherOrganization(organization.id, res, ORGANIZATION_VERIFICATION_STATUS.NAME_EXACT_MATCHED_WITH_DB);
                continue;
              }
            }
            result.rnaNotFound++;
            result.siretNotFound++;
            result.nameNotFound++;
            const status = rna
              ? ORGANIZATION_VERIFICATION_STATUS.RNA_NOT_MATCHED
              : siret
                ? ORGANIZATION_VERIFICATION_STATUS.SIRET_NOT_MATCHED
                : ORGANIZATION_VERIFICATION_STATUS.NAME_NOT_MATCHED;
            await updatePublisherOrganization(organization.id, null, status);
          } catch (error) {
            captureException(error, { extra: { organization } });
          }
        }

        // Log progress
        console.log(
          `[VerifyPublisherOrganization] Progress: ${result.processed}/${totalUnverified} - ` +
            `Verified: ${result.rnaVerified + result.siretVerified + result.nameVerified}, not found: ${result.rnaNotFound + result.siretNotFound + result.nameNotFound}, no identifier: ${result.noIdentifier}`
        );
      }
    } catch (error) {
      captureException(error, { extra: { payload } });
      throw error;
    }

    const end = new Date();
    const durationMs = end.getTime() - start.getTime();

    console.log(`[VerifyPublisherOrganization] Completed in ${durationMs}ms`);
    console.log(`[VerifyPublisherOrganization] Results:`);
    console.log(`  - Total processed: ${result.processed}`);
    console.log(`  - Verified: ${result.verified}`);
    console.log(`  - RNA verified: ${result.rnaVerified}`);
    console.log(`  - SIRET verified: ${result.siretVerified}`);
    console.log(`  - Name verified: ${result.nameVerified}`);
    console.log(`  - RNA not found: ${result.rnaNotFound}`);
    console.log(`  - SIRET not found: ${result.siretNotFound}`);

    return {
      success: true,
      timestamp: new Date(),
      message: `Processed ${result.processed} organizations: ${result.verified} verified, ${result.rnaNotFound} RNA not found, ${result.siretNotFound} SIRET not found, ${result.nameNotFound} name not found`,
      start,
      end,
      result,
    };
  }
}
