import { Job } from "bullmq";
import { captureException } from "../../error";

/**
 * Handler pour le job de génération du flux XML pour letudiant.fr
 * @param job Le job BullMQ
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
    throw error; // Rethrow pour que BullMQ puisse gérer les tentatives
  }
}
