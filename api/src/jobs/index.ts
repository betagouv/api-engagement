import { Worker } from "bullmq";
import { redisConnection } from "../db/redis";
import { captureException } from "../error";
import { jobHandlers } from "./config";

let workers: Worker[] = [];

/**
 * Initialize the job system
 * - Create workers for each queue
 * - Start workers
 */
export async function initializeJobSystem() {
  try {
    workers = Object.entries(jobHandlers).map(([queueName, handler]) => {
      console.log(`[Jobs] Creating worker for queue ${queueName}`);

      const worker = new Worker(queueName, handler, {
        connection: redisConnection,
        concurrency: 1,
        autorun: false,
      });

      worker.on("completed", (job) => {
        console.log(`[${queueName}] Job ${job.id} completed successfully`);
      });

      worker.on("failed", (job, error) => {
        console.error(`[${queueName}] Job ${job?.id} failed:`, error);
        captureException(error);
      });

      return worker;
    });

    await startWorkers();

    console.log("Job system initialized successfully");

    return {
      workers,
      stopWorkers,
    };
  } catch (error) {
    console.error("Failed to initialize job system:", error);
    throw error;
  }
}

/**
 * Start all registered workers
 */
export async function startWorkers(): Promise<Worker[]> {
  for (const worker of workers) {
    await worker.run();
    console.log(`[Jobs] Started worker for queue ${worker.name}`);
  }

  console.log(`[Jobs] Started ${workers.length} workers`);
  return workers;
}

/**
 * Stop all registered workers
 */
export async function stopWorkers(): Promise<void> {
  for (const worker of workers) {
    await worker.close();
    console.log(`[Jobs] Stopped worker for queue ${worker.name}`);
  }

  console.log(`[Jobs] Stopped ${workers.length} workers`);
}
