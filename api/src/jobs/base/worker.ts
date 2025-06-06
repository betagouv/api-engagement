// api/src/jobs/base/worker.ts
import { Job, Processor, Worker, WorkerOptions } from "bullmq";
import { redisConnection } from "../../db/redis";
import { captureException } from "../../error";

export class BaseWorker<PayloadType = any> {
  protected worker: Worker<PayloadType>;

  public readonly queueName: string;

  public readonly workerName?: string; // Can be undefined if the worker handles all jobs of the queue

  public constructor(queueName: string, processor: Processor<PayloadType>, workerOptions?: WorkerOptions, workerName?: string) {
    this.queueName = queueName;
    this.workerName = workerName;

    const fullWorkerNameLog = workerName ? `${queueName}/${workerName}` : queueName;

    this.worker = new Worker<PayloadType>(
      queueName,
      async (job: Job<PayloadType>) => {
        if (workerName && job.name !== workerName) {
          console.warn(`[BaseWorker/${fullWorkerNameLog}] Worker configured for job name '${workerName}' but received job name '${job.name}'. Skipping.`);
          return Promise.resolve(undefined);
        }
        console.log(`[BaseWorker/${fullWorkerNameLog}] Processing job ${job.id} (Name: ${job.name})`);
        try {
          return await processor(job);
        } catch (error) {
          console.error(`[BaseWorker/${fullWorkerNameLog}] Job ${job.id} (Name: ${job.name}) failed during processing:`, error);
          captureException(error);
          throw error; // Throw error to mark job as failed in BullMQ
        }
      },
      {
        connection: redisConnection,
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

  public async start(): Promise<void> {
    if (!this.worker.isRunning()) {
      await this.worker.run();
      const fullWorkerNameLog = this.workerName ? `${this.queueName}/${this.workerName}` : this.queueName;
      console.log(`[BaseWorker/${fullWorkerNameLog}] Worker started and listening for jobs.`);
    }
  }

  public async stop(): Promise<void> {
    const fullWorkerNameLog = this.workerName ? `${this.queueName}/${this.workerName}` : this.queueName;
    console.log(`[BaseWorker/${fullWorkerNameLog}] Stopping worker...`);
    await this.worker.close();
    console.log(`[BaseWorker/${fullWorkerNameLog}] Worker stopped.`);
  }
}
