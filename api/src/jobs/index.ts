import { jobSchedules, jobWorkers } from "./config";

// Keep track of active workers
const workers: any[] = [];

export async function launchJobSystem() {
  // Start workers first
  console.log("[Jobs] Starting workers...");
  for (const [queueName, WorkerClass] of Object.entries(jobWorkers)) {
    const worker = WorkerClass.getInstance();
    await worker.start();
    workers.push(worker);
    console.log(`[Jobs] Worker for queue ${queueName} started successfully`);
  }

  // Then schedule jobs
  console.log("[Jobs] Scheduling jobs...");
  for (const schedule of jobSchedules) {
    await schedule.function.apply(schedule.cronExpression);
    console.log(`[Jobs] Scheduled job ${schedule.title} with cron ${schedule.cronExpression}`);
  }

  console.log("[Jobs] Job system initialization complete");
}

// Add a function to gracefully shut down workers
export async function shutdownJobs() {
  console.log("[Jobs] Shutting down workers...");
  for (const worker of workers) {
    await worker.stop();
  }
  console.log("[Jobs] All workers stopped");
}
