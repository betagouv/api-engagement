import { Job } from "bullmq";
import { captureException } from "../../error";

/**
 * Handler for the letudiant feed generation job
 * @param job The BullMQ job
 */
export async function handler(job: Job): Promise<any> {
  try {
    console.log(`[Letudiant] Processing job ${job.id} of type ${job.name}`);

    console.log("TODO");

    console.log(`[Letudiant] Job ${job.id} completed successfully`);

    return {
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`[Letudiant] Job ${job.id} failed:`, error);
    captureException(error);
    throw error; // BullMQ will handle retries
  }
}
