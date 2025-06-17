import cron from "node-cron";
import { jobSchedules } from "./jobs/config";

import { mongoConnected } from "./db/mongo";
import { redisConnected } from "./db/redis";

/**
 * Start the scheduler process
 * - Schedules recurring tasks (crons) defined in `jobs/config.ts`
 */
export const startScheduler = async () => {
  console.log("[Scheduler] Waiting for database connections...");
  await Promise.all([mongoConnected, redisConnected]);
  console.log("[Scheduler] All database connections established successfully");

  console.log("[Scheduler] Starting job scheduler...");

  for (const schedule of jobSchedules) {
    cron.schedule(schedule.cronExpression, schedule.function);
    console.log(`[Scheduler] Scheduled job ${schedule.title} with cron ${schedule.cronExpression}`);
  }

  console.log("[Scheduler] All crons scheduled. Scheduler is running.");
};
