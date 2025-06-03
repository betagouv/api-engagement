import { Job } from "bullmq";
import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import { captureException } from "../../error";
import { PilotyClient } from "../../services/piloty/client";
import { MEDIA_PUBLIC_ID } from "./config";
import { missionToPilotyCompany, missionToPilotyJob } from "./transformers";
import { getMandatoryData, getMissionsToSync, isAlreadySynced, rateLimit } from "./utils";

/**
 * Handler for the letudiant feed generation job
 * @param job The BullMQ job (optionally contains { id })
 */
export async function handler(bullJob: Job): Promise<any> {
  try {
    const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);
    const { id } = bullJob.data || {};

    const missions = await getMissionsToSync(id);
    console.log(`[Letudiant] Found ${missions.length} missions to sync`);

    const counter = {
      created: 0,
      updated: 0,
      error: 0,
    };

    const mandatoryData = await getMandatoryData(pilotyClient);

    for (const mission of missions) {
      try {
        if (isAlreadySynced(mission) && !id) {
          console.log(`[Letudiant] Mission ${mission._id} already synced, skipping`);
          continue; // idempotence unless force by id
        }

        if (!mission.organizationName) {
          console.log(`[Letudiant] Mission ${mission._id} has no organization name, skipping`);
          continue;
        }

        let pilotyCompany = await pilotyClient.findCompanyByName(mission.organizationName);

        if (!pilotyCompany) {
          const companyPayload = missionToPilotyCompany(mission);
          pilotyCompany = await pilotyClient.createCompany(companyPayload);
          console.log("[Letudiant] Created company", pilotyCompany);
        }

        // TODO: handle company update
        if (!pilotyCompany) {
          throw new Error("Unable to create company for mission");
        }

        const jobPayload = missionToPilotyJob(mission, pilotyCompany.public_id, mandatoryData);
        console.log(jobPayload);
        let pilotyJob = null;

        if (mission.letudiantPublicId) {
          counter.updated++;
          pilotyJob = await pilotyClient.updateJob(mission.letudiantPublicId, jobPayload);
        } else {
          counter.created++;
          pilotyJob = await pilotyClient.createJob(jobPayload);
        }

        mission.letudiantPublicId = pilotyJob.public_id;
        mission.letudiantUpdatedAt = new Date();

        await mission.save();
      } catch (err) {
        counter.error++;
        console.error(`[Letudiant] Mission ${mission._id}:`, err);
      }
      await rateLimit();
    }

    return {
      success: true,
      timestamp: new Date(),
      counter: {
        processed: missions.length,
        ...counter,
      },
    };
  } catch (error) {
    captureException(error);
    console.error("[Letudiant Handler] Fatal error:", error);

    return {
      success: false,
      error: error?.toString(),
      timestamp: new Date(),
    };
  }
}
