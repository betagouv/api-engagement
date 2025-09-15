import { HydratedDocument } from "mongoose";
import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import { captureException } from "../../error";
import MissionModel from "../../models/mission";
import OrganizationModel from "../../models/organization";
import { PilotyClient, PilotyError } from "../../services/piloty/";
import { PilotyJob } from "../../services/piloty/types";
import { Mission, Organization } from "../../types";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { DEFAULT_LIMIT, MEDIA_PUBLIC_ID } from "./config";
import { missionToPilotyCompany, missionToPilotyJobs } from "./transformers";
import { getMandatoryData, getMissionsToSync, rateLimit } from "./utils";

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

    const missions = await getMissionsToSync(id, limit || DEFAULT_LIMIT);
    console.log(`[LetudiantHandler] Found ${missions.length} missions to sync`);

    const counter = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      error: 0,
    };

    const mandatoryData = await getMandatoryData(pilotyClient);

    for (const mission of missions) {
      try {
        const organization = await OrganizationModel.findOne({ _id: mission.organizationId });
        if (!organization) {
          console.log(`[LetudiantHandler] Mission ${mission._id} has no organization, skipping`);
          counter.skipped++;
          continue;
        }

        const pilotyCompanyPublicId = await getCompanyPilotyId(pilotyClient, mission, organization);

        if (!pilotyCompanyPublicId) {
          throw new Error("Unable to get company public ID for mission");
        }

        const jobPayloads = missionToPilotyJobs(mission, pilotyCompanyPublicId, mandatoryData);
        const processedIds: Record<string, string> = {};

        // Create / update jobs related to each address
        // letudiantPublicId is an object with the localisation as key
        for (const jobPayload of jobPayloads) {
          let pilotyJob: PilotyJob | null = null;
          const letudiantPublicId = mission.letudiantPublicId?.[mission.remote === "full" ? "A distance" : jobPayload.localisation];

          if (letudiantPublicId) {
            console.log(`[LetudiantHandler] Updating job ${mission._id} - ${jobPayload.localisation} (${letudiantPublicId})`);
            pilotyJob = await pilotyClient.updateJob(letudiantPublicId, jobPayload);
            if (jobPayload.state === "archived") {
              counter.deleted++;
            } else {
              counter.updated++;
            }
          } else {
            console.log(`[LetudiantHandler] Creating job ${mission._id} - ${jobPayload.localisation}`);
            pilotyJob = await pilotyClient.createJob(jobPayload);
            counter.created++;
          }

          if (!pilotyJob) {
            throw new Error("Unable to create or update job for mission");
          } else {
            processedIds[mission.remote === "full" ? "A distance" : jobPayload.localisation] = pilotyJob.public_id;
          }

          await rateLimit();
        }

        // Update mission and avoid updatedAt update
        await MissionModel.updateOne(
          { _id: mission._id },
          {
            $set: {
              letudiantPublicId: processedIds,
              letudiantUpdatedAt: new Date(),
            },
          },
          { timestamps: false }
        );
      } catch (error) {
        captureException(`[LetudiantHandler] Error processing mission`, { extra: { error, missionId: mission._id, id, limit } });

        // Update mission and avoid updatedAt update
        await MissionModel.updateOne(
          { _id: mission._id },
          {
            $set: {
              letudiantError: error instanceof Error ? error.message : "Unknown error",
            },
          },
          { timestamps: false }
        );

        counter.error++;
      }
    }

    return {
      success: true,
      timestamp: new Date(),
      counter: {
        processed: missions.length,
        ...counter,
      },
      message: `\t• Nombre de missions traitées: ${missions.length}\n\t• Nombre de missions créées: ${counter.created}\n\t• Nombre de missions mises à jour: ${counter.updated}\n\t• Nombre de missions supprimées: ${counter.deleted}\n\t• Nombre de missions en erreur: ${counter.error}`,
    };
  }
}

const getCompanyPilotyId = async (pilotyClient: PilotyClient, mission: HydratedDocument<Mission>, organization: HydratedDocument<Organization>): Promise<string | null> => {
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
      await OrganizationModel.updateOne({ _id: organization._id }, { letudiantPublicId: pilotyCompanyPublicId, letudiantUpdatedAt: new Date() });
      console.log(`[LetudiantHandler] Organization ${organization.title} updated with letudiantPublicId ${pilotyCompanyPublicId}`);
    }
  }

  return pilotyCompanyPublicId;
};
