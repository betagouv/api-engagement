import { Job } from "bullmq";
import { HydratedDocument } from "mongoose";
import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import OrganizationModel from "../../models/organization";
import { PilotyClient, PilotyCompany, PilotyError } from "../../services/piloty/";
import { Mission, Organization } from "../../types";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { MEDIA_PUBLIC_ID } from "./config";
import { LetudiantQueue } from "./queue";
import { missionToPilotyCompany, missionToPilotyJob } from "./transformers";
import { getMandatoryData, getMissionsToSync, rateLimit } from "./utils";

const DEFAULT_LIMIT = 10;

export interface LetudiantJobPayload {
  id?: string;
  limit?: number;
}

export interface LetudiantJobResult extends JobResult {
  counter: {
    processed: number;
    created: number;
    updated: number;
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
  public readonly JOB_NAME = "letudiant-exporter";

  public readonly queue = new LetudiantQueue();

  public async handle(bullJob: Job<LetudiantJobPayload>): Promise<LetudiantJobResult> {
    const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);
    const { id, limit } = bullJob.data;

    const missions = await getMissionsToSync(id, limit || DEFAULT_LIMIT);
    console.log(`[LetudiantHandler] Found ${missions.length} missions to sync`);

    const counter = {
      created: 0,
      updated: 0,
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

        const pilotyCompany = await createOrUpdateCompany(pilotyClient, mission, organization);

        const jobPayload = missionToPilotyJob(mission, pilotyCompany.public_id, mandatoryData);
        let pilotyJob = null;

        if (mission.letudiantPublicId) {
          console.log(`[LetudiantHandler] Updating job ${mission._id} (${mission.letudiantPublicId})`);
          pilotyJob = await pilotyClient.updateJob(mission.letudiantPublicId, jobPayload);
          counter.updated++;
        } else {
          console.log(`[LetudiantHandler] Creating job ${mission._id}`);
          pilotyJob = await pilotyClient.createJob(jobPayload);
          counter.created++;
        }

        if (!pilotyJob) {
          throw new Error("Unable to create or update job for mission");
        } else {
          mission.letudiantPublicId = pilotyJob.public_id;
          mission.letudiantUpdatedAt = new Date();

          await mission.save();
        }

        await rateLimit();
      } catch (error) {
        console.error(`[LetudiantHandler] Error processing mission ${mission._id}`, error);
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
    };
  }

  public async schedule(): Promise<void> {
    console.log(`[LetudiantHandler] Scheduling job '${this.JOB_NAME}' to queue '${this.queue.queueName}'`);
    try {
      // Add the job with its specific name and an empty payload.
      // The worker (LetudiantHandler.handle) will pick it up based on the JOB_NAME.
      // An empty payload {} means the handle method will use default values if any (e.g., for limit).
      await this.queue.addJob(this.JOB_NAME, {});
      console.log(`[LetudiantHandler] Successfully added job '${this.JOB_NAME}' to queue '${this.queue.queueName}'`);
    } catch (error) {
      console.error(`[LetudiantHandler] Failed to add job '${this.JOB_NAME}' to queue '${this.queue.queueName}':`, error);
      // Depending on requirements, you might want to re-throw the error or handle it.
    }
  }
}

const createOrUpdateCompany = async (pilotyClient: PilotyClient, mission: HydratedDocument<Mission>, organization: HydratedDocument<Organization>): Promise<PilotyCompany> => {
  const companyPayload = await missionToPilotyCompany(mission);
  let pilotyCompany = null;

  if (organization.letudiantPublicId) {
    console.log(`[LetudiantHandler] Company ${organization.title} already exists (${organization.letudiantPublicId})`);
    pilotyCompany = await pilotyClient.getCompanyById(organization.letudiantPublicId);
  } else {
    console.log(`[LetudiantHandler] Company ${organization.title} not found: creating...`);
    try {
      pilotyCompany = await pilotyClient.createCompany(companyPayload);
    } catch (error) {
      if (error instanceof PilotyError && error.status === 409) {
        console.log(`[LetudiantHandler] Company ${organization.title} already exists (409)`);
        pilotyCompany = await pilotyClient.findCompanyByName(companyPayload.name);
      } else {
        throw error;
      }
    }
  }

  if (!pilotyCompany) {
    throw new Error("Unable to create company for mission");
  } else {
    await OrganizationModel.updateOne({ _id: organization._id }, { letudiantPublicId: pilotyCompany.public_id, letudiantUpdatedAt: new Date() });
  }

  return pilotyCompany;
};
