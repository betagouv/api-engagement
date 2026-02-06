import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import { captureException } from "../../error";
import missionJobBoardService from "../../services/mission-jobboard";
import { organizationService } from "../../services/organization";
import { PilotyClient, PilotyError } from "../../services/piloty/";
import { PilotyJob } from "../../services/piloty/types";
import { MissionRecord } from "../../types/mission";
import type { MissionJobBoardRecord, MissionJobBoardSyncStatus } from "../../types/mission-job-board";
import { OrganizationRecord } from "../../types/organization";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { DEFAULT_LIMIT, MEDIA_PUBLIC_ID } from "./config";
import { missionToPilotyCompany, missionToPilotyJobs } from "./transformers";
import { LETUDIANT_JOB_BOARD_ID, getMandatoryData, getMissionsToSync, rateLimit } from "./utils";

export interface LetudiantJobPayload {
  id?: string;
  limit?: number;
}

export interface LetudiantJobResult extends JobResult {
  counter: {
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    error: number;
  };
}

/**
 * Main class handler for L'Etudiant
 * - Handles the job processing
 * - Schedules the job
 */
export class LetudiantHandler implements BaseHandler<LetudiantJobPayload, LetudiantJobResult> {
  name = "Sync des missions L'Etudiant";

  public async handle(payload: LetudiantJobPayload): Promise<LetudiantJobResult> {
    const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);
    const { id, limit } = payload;
    console.log(`[LetudiantHandler] Starting job with ${id ? `id ${id}` : "all missions"} and limit ${limit || DEFAULT_LIMIT}`);

    const { totalCandidates, entries: missionEntries } = await getMissionsToSync(id, limit || DEFAULT_LIMIT);
    console.log(`[LetudiantHandler] Found ${totalCandidates} missions to sync`);
    console.log(`[LetudiantHandler] Syncing ${missionEntries.length} missions...`);

    const counter = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      error: 0,
    };

    const mandatoryData = await getMandatoryData(pilotyClient);

    for (const { mission, jobBoards } of missionEntries) {
      let processedJobBoards: Array<{ missionAddressId: string | null; publicId: string; syncStatus?: MissionJobBoardSyncStatus | null; comment?: string | null }> = [];
      try {
        const organizationId = mission.organizationId;
        if (!organizationId) {
          console.log(`[LetudiantHandler] Mission ${mission.id} has no organization, skipping`);
          counter.skipped++;
          continue;
        }
        const organization = await organizationService.findOneOrganizationById(organizationId);
        if (!organization) {
          console.log(`[LetudiantHandler] Mission ${mission.id} has no organization, skipping`);
          counter.skipped++;
          continue;
        }

        const pilotyCompanyPublicId = await getCompanyPilotyId(pilotyClient, mission, organization);

        if (!pilotyCompanyPublicId) {
          throw new Error("Unable to get company public ID for mission");
        }

        const jobPayloads = missionToPilotyJobs(mission, pilotyCompanyPublicId, mandatoryData);
        processedJobBoards = [];

        // Create / update jobs related to each address
        for (const jobPayload of jobPayloads) {
          let pilotyJob: PilotyJob | null = null;
          const letudiantPublicId = findLetudiantPublicId(jobBoards, jobPayload.missionAddressId ?? null);
          try {
            if (letudiantPublicId) {
              console.log(`[LetudiantHandler] Updating job ${mission.id} - ${jobPayload.payload.localisation} (${letudiantPublicId}) -> ${jobPayload.payload.state}`);
              pilotyJob = await pilotyClient.updateJob(letudiantPublicId, jobPayload.payload);
              if (jobPayload.payload.state === "archived") {
                counter.deleted++;
              } else {
                counter.updated++;
              }
            } else {
              console.log(`[LetudiantHandler] Creating job ${mission.id} - ${jobPayload.payload.localisation}`);
              pilotyJob = await pilotyClient.createJob(jobPayload.payload);
              counter.created++;
            }

            if (!pilotyJob) {
              throw new Error("Unable to create or update job for mission");
            }
            const syncStatus = jobPayload.payload.state === "archived" ? "OFFLINE" : "ONLINE";
            processedJobBoards.push({ missionAddressId: jobPayload.missionAddressId ?? null, publicId: pilotyJob.public_id, syncStatus });

            await rateLimit();
          } catch (error: any) {
            counter.error++;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            processedJobBoards.push({ missionAddressId: jobPayload.missionAddressId ?? null, publicId: letudiantPublicId ?? "", syncStatus: "ERROR", comment: errorMessage });
            if (error instanceof PilotyError && error.status === 422) {
              console.log(`[LetudiantHandler] Job ${mission.id} - ${jobPayload.payload.localisation} is invalid: ${errorMessage}`);
            } else {
              captureException(error, { extra: { missionId: mission.id, jobPayload } });
            }
          }
        }

        await missionJobBoardService.replaceForMission(LETUDIANT_JOB_BOARD_ID, mission.id, processedJobBoards);
      } catch (error) {
        captureException(error, { extra: { missionId: mission.id, id, limit } });
        counter.error++;
      }
    }

    return {
      success: true,
      timestamp: new Date(),
      counter: {
        processed: missionEntries.length,
        ...counter,
      },
      message: `\t• Nombre de missions traitées: ${missionEntries.length}
      \n\t• Nombre de missions créées: ${counter.created}
      \n\t• Nombre de missions mises à jour: ${counter.updated}
      \n\t• Nombre de missions supprimées: ${counter.deleted}
      \n\t• Nombre de missions en erreur: ${counter.error}`,
    };
  }
}

const getCompanyPilotyId = async (pilotyClient: PilotyClient, mission: MissionRecord, organization: OrganizationRecord): Promise<string | null> => {
  let pilotyCompanyPublicId: string | null = null;

  if (organization.letudiantPublicId) {
    console.log(`[LetudiantHandler] Company ${organization.title} already exists (${organization.letudiantPublicId})`);
    pilotyCompanyPublicId = organization.letudiantPublicId;
  } else {
    console.log(`[LetudiantHandler] Company ${organization.title} not found: creating...`);
    const companyPayload = await missionToPilotyCompany(mission);
    try {
      const pilotyCompany = await pilotyClient.createCompany(companyPayload);
      console.log(`[LetudiantHandler] Company ${organization.title} created (${pilotyCompany.public_id})`);
      pilotyCompanyPublicId = pilotyCompany.public_id;
    } catch (error) {
      if (error instanceof PilotyError && error.status === 409) {
        console.log(`[LetudiantHandler] Company ${organization.title} already exists (409)`);
        const pilotyCompany = await pilotyClient.findCompanyByName(companyPayload.name);
        console.log(`[LetudiantHandler] Company ${organization.title} found (${pilotyCompany?.public_id})`);
        pilotyCompanyPublicId = pilotyCompany?.public_id || null;
      } else {
        throw error;
      }
    }

    if (pilotyCompanyPublicId) {
      await organizationService.updateOrganization(organization.id, { letudiantPublicId: pilotyCompanyPublicId, letudiantUpdatedAt: new Date() });
      console.log(`[LetudiantHandler] Organization ${organization.title} updated with letudiantPublicId ${pilotyCompanyPublicId}`);
    }
  }
  await rateLimit();
  return pilotyCompanyPublicId;
};

export function findLetudiantPublicId(jobBoards: MissionJobBoardRecord[], missionAddressId: string | null): string | undefined {
  const match = jobBoards.find((entry) => entry.missionAddressId === missionAddressId);
  if (match) {
    return match.publicId;
  }
  if (missionAddressId) {
    const fallback = jobBoards.find((entry) => entry.missionAddressId === null);
    return fallback?.publicId;
  }
  return undefined;
}
