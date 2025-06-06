import cron from "node-cron";
import { jobSchedules } from "./jobs/config";

/**
 * Start the scheduler process
 * - Schedules recurring tasks (crons) defined in `jobs/config.ts`
 */
export function startScheduler() {
  console.log("[Scheduler] Starting job scheduler...");

  for (const schedule of jobSchedules) {
    cron.schedule(schedule.cronExpression, schedule.function);
    console.log(`[Scheduler] Scheduled job ${schedule.title} with cron ${schedule.cronExpression}`);
  }

  console.log("[Scheduler] All crons scheduled. Scheduler is running.");
}
