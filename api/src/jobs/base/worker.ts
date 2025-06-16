// api/src/jobs/base/worker.ts
import { Job, Processor, Worker, WorkerOptions } from "bullmq";
import { REDIS_URL } from "../../config";
import { redisOptions } from "../../db/redis";
import { Redis } from "ioredis";
import { captureException } from "../../error";

export class BaseWorker<PayloadType = any> {
  protected worker: Worker<PayloadType>;

  public readonly queueName: string;

  public readonly workerName?: string; // Can be undefined if the worker handles all jobs of the queue

  public constructor(queueName: string, processor: Processor<PayloadType>, workerOptions?: WorkerOptions, workerName?: string) {
    this.queueName = queueName;
    this.workerName = workerName;

    const fullWorkerNameLog = workerName ? `${queueName}/${workerName}` : queueName;

    // Combine the shared redisOptions with the BullMQ-specific requirements.
    // This ensures TLS and other settings are consistent, while respecting BullMQ's needs.
    const connectionOptions = {
      ...redisOptions,
      maxRetriesPerRequest: null, // Explicitly set for BullMQ
    };

    this.worker = new Worker<PayloadType>(
      queueName,
      async (job: Job<PayloadType>) => {
        try {
          console.log(`[Worker/${fullWorkerNameLog}] Processing job #${job.id}`);
          await processor(job);
          console.log(`[Worker/${fullWorkerNameLog}] Completed job #${job.id}`);
        } catch (error: any) {
          console.error(`[Worker/${fullWorkerNameLog}] Failed job #${job.id}`, error);
          captureException(error);
          throw error; // Re-throw to let BullMQ handle the job failure
        }
      },
      {
        connection: new Redis(REDIS_URL, connectionOptions),
        concurrency: 1,
        autorun: false,
        ...workerOptions,
      }
    );

    this.worker.on("completed", (job, result) => {
      console.log(`[BaseWorker/${fullWorkerNameLog}] Job ${job.id} (Name: ${job.name}) completed.`);
    });

    this.worker.on("failed", (job, error) => {
      console.error(`[BaseWorker/${fullWorkerNameLog}] Job ${job?.id} (Name: ${job?.name}) failed (event listener). Error: ${error.message}`);
    });

    this.worker.on("error", (err) => {
      console.error(`[BaseWorker/${fullWorkerNameLog}] Worker instance error:`, err);
      captureException(err);
    });

    console.log(`[BaseWorker/${fullWorkerNameLog}] Initialized worker for queue: ${queueName}`);
  }

  public start(): void {
    if (!this.worker.isRunning()) {
      this.worker.run().catch((err) => {
        const fullWorkerNameLog = this.workerName ? `${this.queueName}/${this.workerName}` : this.queueName;
        console.error(`[BaseWorker/${fullWorkerNameLog}] Error from worker.run() promise:`, err);
        captureException(err); // Capture the error from the run() promise itself
      });
    }
  }

  public async stop(): Promise<void> {
    const fullWorkerNameLog = this.workerName ? `${this.queueName}/${this.workerName}` : this.queueName;
    console.log(`[BaseWorker/${fullWorkerNameLog}] Stopping worker...`);
    await this.worker.close();
    console.log(`[BaseWorker/${fullWorkerNameLog}] Worker stopped.`);
  }
}
