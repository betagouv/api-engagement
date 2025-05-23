import { Job } from "bullmq";
import { captureException } from "../../error";

/**
 * Handler for the letudiant feed generation job
 * @param job The BullMQ job
 */
export async function handler(job: Job): Promise<any> {
  try {
    console.log("TODO - Letudiant");

    return {
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    captureException(error);
    throw error; // BullMQ will handle retries
  }
}
