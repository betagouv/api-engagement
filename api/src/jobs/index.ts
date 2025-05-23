import { jobConfigs, jobSchedules } from "./config";

const workers: any[] = [];

export async function launchJobSystem() {
  console.log("[Job workers] Starting workers...");
  for (const [queueName, config] of Object.entries(jobConfigs)) {
    await config.worker.start();
    workers.push(config.worker);
    console.log(`[Job workers] Worker for queue ${queueName} started successfully`);
  }

  console.log("[Job workers] Scheduling jobs...");
  for (const schedule of jobSchedules) {
    await schedule.function(schedule.cronExpression);
    console.log(`[Job workers] Scheduled job ${schedule.title} with cron ${schedule.cronExpression}`);
  }

  console.log("[Job workers] Job system initialization complete");
}

export async function shutdownJobs() {
  console.log("[Job workers] Shutting down workers...");
  for (const worker of workers) {
    await worker.stop();
  }
  console.log("[Job workers] All workers stopped");
}
