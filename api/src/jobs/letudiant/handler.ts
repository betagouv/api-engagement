import { Job } from "bullmq";
import { HydratedDocument } from "mongoose";
import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import OrganizationModel from "../../models/organization";
import { PilotyClient } from "../../services/piloty/client";
import { PilotyCompany } from "../../services/piloty/types";
import { Mission, Organization } from "../../types";
import { MEDIA_PUBLIC_ID } from "./config";
import { missionToPilotyCompany, missionToPilotyJob } from "./transformers";
import { getMandatoryData, getMissionsToSync, rateLimit } from "./utils";

const DEFAULT_LIMIT = 10;

/**
 * Handler for the letudiant feed generation job
 * @param job The BullMQ job (optionally contains { id, limit })
 */
export async function handler(bullJob: Job): Promise<any> {
  const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);
  const { id, limit } = bullJob.data || {};

  const missions = await getMissionsToSync(id, limit || DEFAULT_LIMIT);
  console.log(`[Letudiant] Found ${missions.length} missions to sync`);

  const counter = {
    created: 0,
    updated: 0,
    error: 0,
  };

  const mandatoryData = await getMandatoryData(pilotyClient);

  for (const mission of missions) {
    try {
      const organization = await OrganizationModel.findOne({ _id: mission.organizationId });
      if (!organization) {
        console.log(`[Letudiant] Mission ${mission._id} has no organization, skipping`);
        continue;
      }

      const pilotyCompany = await createOrUpdateCompany(pilotyClient, mission, organization);

      const jobPayload = missionToPilotyJob(mission, pilotyCompany.public_id, mandatoryData);
      let pilotyJob = null;

      if (mission.letudiantPublicId) {
        console.log(`[Letudiant] Updating job ${mission._id} (${mission.letudiantPublicId})`);
        pilotyJob = await pilotyClient.updateJob(mission.letudiantPublicId, jobPayload);
        counter.updated++;
      } else {
        console.log(`[Letudiant] Creating job ${mission._id}`);
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
      console.error(`[Letudiant] Error processing mission ${mission._id}`, error);
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

async function createOrUpdateCompany(pilotyClient: PilotyClient, mission: HydratedDocument<Mission>, organization: HydratedDocument<Organization>): Promise<PilotyCompany> {
  const companyPayload = await missionToPilotyCompany(mission);
  let pilotyCompany = null;

  if (organization.letudiantPublicId) {
    console.log(`[Letudiant] Company ${organization.title} already exists (${organization.letudiantPublicId})`);
    pilotyCompany = await pilotyClient.getCompanyById(organization.letudiantPublicId);
    // TODO: update company if needed
  } else {
    console.log(`[Letudiant] Company ${organization.title} not found: creating...`);
    try {
      pilotyCompany = await pilotyClient.createCompany(companyPayload);
    } catch (error) {
      if (error instanceof Error && error.message.includes("company-already-existed")) {
        console.log(`[Letudiant] Company ${organization.title} already exists`);
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
}
