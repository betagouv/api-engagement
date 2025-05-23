import { handler } from "./handler";
import { Queue } from "./queue";
import { Worker } from "./worker";

export const JOB_NAME = "letudiant-feed";

/**
 * Schedule the feed generation
 * @param cronExpression Expression cron for the schedule (default: every day at 2am)
 */
export async function schedule(cronExpression = "0 2 * * *") {
  try {
    const queue = Queue.getInstance();
    await queue.scheduleFeedGeneration(cronExpression);
  } catch (error) {
    console.error("Failed to schedule letudiant feed generation:", error);
    throw error;
  }
}

/**
 * Manually trigger the feed generation
 */
export async function trigger() {
  try {
    const queue = Queue.getInstance();
    const job = await queue.generateFeed();
    console.log(`[Letudiant] Feed generation job added with ID: ${job?.id || "unknown"}`);
    return job;
  } catch (error) {
    console.error("[Letudiant] Failed to trigger feed generation:", error);
    throw error;
  }
}

export { handler, Queue, Worker };
