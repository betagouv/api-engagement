import { handler } from "./handler";
import { Queue } from "./queue";

/**
 * Schedule the feed generation
 * @param cronExpression Expression cron for the schedule (default: every day at 2am)
 */
async function schedule(cronExpression = "0 2 * * *") {
  try {
    const queue = Queue.getInstance();
    await queue.scheduleFeedGeneration(cronExpression);
    console.log(`Letudiant feed generation scheduled with cron: ${cronExpression}`);
  } catch (error) {
    console.error("Failed to schedule letudiant feed generation:", error);
    throw error;
  }
}

/**
 * Manually trigger the feed generation
 */
async function trigger() {
  try {
    const queue = Queue.getInstance();
    const job = await queue.generateFeed();
    console.log(`Letudiant feed generation job added with ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error("Failed to trigger letudiant feed generation:", error);
    throw error;
  }
}

export { handler, schedule, trigger };
