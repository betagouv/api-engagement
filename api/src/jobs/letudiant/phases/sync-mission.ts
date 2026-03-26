import { captureException } from "@/error";
import { missionToPilotyCompany, missionToPilotyJobs } from "@/jobs/letudiant/transformers";
import { LETUDIANT_JOB_BOARD_ID, rateLimit } from "@/jobs/letudiant/utils";
import missionJobBoardService from "@/services/mission-jobboard";
import { organizationService } from "@/services/organization";
import { PilotyClient, PilotyError } from "@/services/piloty";
import { PilotyJob, PilotyMandatoryData } from "@/services/piloty/types";
import { MissionRecord } from "@/types/mission";
import type { MissionJobBoardRecord, MissionJobBoardSyncStatus } from "@/types/mission-job-board";
import { OrganizationRecord } from "@/types/organization";

export type LetudiantJobCounter = {
  archived: number;
  updated: number;
  published: number;
  skipped: number;
  error: number;
};

/**
 * Sync a single mission to Piloty: create or update job entries per address.
 * Returns the number of Piloty entries successfully created or updated.
 */
export async function syncMission(
  pilotyClient: PilotyClient,
  mission: MissionRecord,
  existingJobBoards: MissionJobBoardRecord[],
  mandatoryData: PilotyMandatoryData,
  counter: LetudiantJobCounter,
  mode: "create" | "update",
  dryRun = false
): Promise<number> {
  const organizationId = mission.organizationId;
  if (!organizationId) {
    console.log(`[LetudiantHandler] Mission ${mission.id} has no organization, skipping`);
    counter.skipped++;
    return 0;
  }

  const organization = await organizationService.findOneOrganizationById(organizationId);
  if (!organization) {
    console.log(`[LetudiantHandler] Organization ${organizationId} not found for mission ${mission.id}, skipping`);
    counter.skipped++;
    return 0;
  }

  const pilotyCompanyPublicId = await getCompanyPilotyId(pilotyClient, mission, organization, dryRun);
  const jobPayloads = missionToPilotyJobs(mission, pilotyCompanyPublicId ?? "not-found", mandatoryData);

  if (!pilotyCompanyPublicId) {
    console.log(`[LetudiantHandler] Unable to get company public ID for mission ${mission.id}`);
    if (!dryRun) {
      const errorEntries = jobPayloads.map((jp) => ({
        missionAddressId: jp.missionAddressId ?? null,
        publicId: "",
        syncStatus: "ERROR" as MissionJobBoardSyncStatus,
        comment: "Cannot create company",
      }));
      await missionJobBoardService.replaceForMission(LETUDIANT_JOB_BOARD_ID, mission.id, errorEntries);
    }
    counter.error++;
    return 0;
  }

  const processedJobBoards: Array<{
    missionAddressId: string | null;
    publicId: string;
    syncStatus?: MissionJobBoardSyncStatus | null;
    comment?: string | null;
  }> = [];

  let successCount = 0;

  for (const jobPayload of jobPayloads) {
    const letudiantPublicId = findLetudiantPublicId(existingJobBoards, jobPayload.missionAddressId ?? null);

    if (dryRun) {
      const action = letudiantPublicId ? (mode === "update" ? "update" : "create (with existing ID)") : "create";
      console.log(`[DRY RUN] Would ${action} job ${mission.id} - ${jobPayload.payload.localisation}`);
      letudiantPublicId ? counter.updated++ : counter.published++;
      successCount++;
      continue;
    }

    try {
      let pilotyJob: PilotyJob | null = null;
      if (letudiantPublicId) {
        console.log(
          `[LetudiantHandler] ${mode === "update" ? "Updating" : "Creating (with existing ID)"} job ${mission.id} - ${jobPayload.payload.localisation} (${letudiantPublicId})`
        );
        pilotyJob = await pilotyClient.updateJob(letudiantPublicId, jobPayload.payload);
        counter.updated++;
      } else {
        console.log(`[LetudiantHandler] Creating job ${mission.id} - ${jobPayload.payload.localisation}`);
        pilotyJob = await pilotyClient.createJob(jobPayload.payload);
        counter.published++;
      }

      if (!pilotyJob) {
        throw new Error("Unable to create or update job for mission");
      }
      processedJobBoards.push({
        missionAddressId: jobPayload.missionAddressId ?? null,
        publicId: pilotyJob.public_id,
        syncStatus: "ONLINE",
      });
      successCount++;
      await rateLimit();
    } catch (error: any) {
      counter.error++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      processedJobBoards.push({
        missionAddressId: jobPayload.missionAddressId ?? null,
        publicId: letudiantPublicId ?? "",
        syncStatus: "ERROR",
        comment: errorMessage,
      });
      if (error instanceof PilotyError && error.status === 422) {
        console.log(`[LetudiantHandler] Job ${mission.id} - ${jobPayload.payload.localisation} is invalid: ${errorMessage}`);
      } else {
        captureException(error, { extra: { missionId: mission.id, jobPayload } });
      }
    }
  }

  if (!dryRun) {
    await missionJobBoardService.replaceForMission(LETUDIANT_JOB_BOARD_ID, mission.id, processedJobBoards);
  }
  return successCount;
}

export const getCompanyPilotyId = async (pilotyClient: PilotyClient, mission: MissionRecord, organization: OrganizationRecord, dryRun = false): Promise<string | null> => {
  let pilotyCompanyPublicId: string | null;

  if (organization.letudiantPublicId) {
    console.log(`[LetudiantHandler] Company ${organization.title} already exists (${organization.letudiantPublicId})`);
    pilotyCompanyPublicId = organization.letudiantPublicId;
  } else if (dryRun) {
    console.log(`[DRY RUN] Would create company for ${organization.title}`);
    pilotyCompanyPublicId = "dry-run-company-id";
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
  if (!dryRun) {
    await rateLimit();
  }
  return pilotyCompanyPublicId;
};

export function findLetudiantPublicId(jobBoards: MissionJobBoardRecord[], missionAddressId: string | null): string | undefined {
  const onlineJobBoards = jobBoards.filter((entry) => entry.syncStatus === "ONLINE" && Boolean(entry.publicId));
  const match = onlineJobBoards.find((entry) => entry.missionAddressId === missionAddressId);
  if (match) {
    return match.publicId;
  }
  if (missionAddressId) {
    const fallback = onlineJobBoards.find((entry) => entry.missionAddressId === null);
    return fallback?.publicId;
  }
  return undefined;
}
