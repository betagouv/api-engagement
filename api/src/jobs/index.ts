// api/src/jobs/index.ts
import { WorkerOptions } from "bullmq";
import { captureException } from "../error";
import { BaseWorker } from "./base/worker";
import { jobWorkers } from "./config";

const activeWorkers: BaseWorker<any>[] = [];

/**
 * Initializes and starts all configured job workers.
 */
export async function launchJobSystem(): Promise<void> {
  console.log("[JobSystem] Launching job system...");

  if (jobWorkers.length === 0) {
    console.warn("[JobSystem] No workers configured. Job system will be idle.");
    return;
  }

  for (const workerConfig of jobWorkers) {
    const { queueName, processor, name } = workerConfig;
    const workerOptions: WorkerOptions | undefined = undefined;

    try {
      const worker = new BaseWorker(queueName, processor, workerOptions, name);

      worker.start();
      activeWorkers.push(worker);
    } catch (error) {
      captureException("[JobSystem] Failed to instantiate or start worker", { extra: { queueName, name } });
    }
  }

  if (activeWorkers.length > 0) {
    console.log(`[JobSystem] All ${activeWorkers.length} configured workers launched.`);
  } else {
    console.error("[JobSystem] No workers were successfully launched.");
  }
}

/**
 * Gracefully shuts down all active job workers.
 */
export async function shutdownJobs(): Promise<void> {
  console.log(`[JobSystem] Shutting down ${activeWorkers.length} active workers...`);
  const shutdownPromises = activeWorkers.map(async (worker) => {
    try {
      await worker.stop();
    } catch (error) {
      console.error(`[JobSystem] Error stopping worker for queue ${worker.queueName}${worker.workerName ? ` (Job: ${worker.workerName})` : ""}:`, error);
    }
  });

  await Promise.allSettled(shutdownPromises); // Wait for all stop attempts

  activeWorkers.length = 0; // Clear the array
  console.log("[JobSystem] All workers have been requested to shut down.");
}
