import { Job } from "bullmq";
import { LETUDIANT_PILOTY_TOKEN } from "../../config";
import { captureException } from "../../error";
import MissionModel from "../../models/mission";
import { PilotyClient } from "../../services/piloty/client";
import { missionToPilotyCompany, missionToPilotyJob } from "./transformers";
import { getMissionsToSync, isAlreadySynced, rateLimit } from "./utils";

/**
 * Handler for the letudiant feed generation job
 * @param job The BullMQ job (optionally contains { id })
 */
export async function handler(bullJob: Job): Promise<any> {
  try {
    const pilotyClient = new PilotyClient(LETUDIANT_PILOTY_TOKEN);
    const { id } = bullJob.data || {};

    const missions = await getMissionsToSync(id);
    console.log(`[Letudiant] Found ${missions.length} missions to sync`);

    const counter = {
      success: 0,
      error: 0,
    };

    for (const mission of missions) {
      try {
        if (isAlreadySynced(mission) && !id) {
          console.log(`[Letudiant] Mission ${mission._id} already synced, skipping`);
          continue; // idempotence unless force by id
        }

        const companyPayload = missionToPilotyCompany(mission);
        const pilotyCompany = await pilotyClient.createCompany(companyPayload);

        // TODO: handle company update
        if (!pilotyCompany) {
          throw new Error("Unable to create company for mission");
        }

        const jobPayload = missionToPilotyJob(mission, pilotyCompany.public_id);
        let pilotyJob = null;

        if (mission.letudiantPublicId) {
          pilotyJob = await pilotyClient.updateJob(mission.letudiantPublicId, jobPayload);
        } else {
          pilotyJob = await pilotyClient.createJob(jobPayload);
        }

        // TODO: process in bulk
        await MissionModel.updateOne(
          { _id: mission._id },
          {
            $set: {
              letudiantPublicId: pilotyJob.public_id,
              letudiantCreatedAt: pilotyJob.createdAt,
            },
          }
        );
        counter.success++;
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
