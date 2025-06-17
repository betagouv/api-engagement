import { QueueOptions as BullMQQueueOptions, Job, JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../../db/redis";

export abstract class BaseQueue<PayloadType = any> {
  protected queue: Queue<PayloadType>;

  public readonly queueName: string;

  public constructor(queueName: string, queueOptions?: Partial<BullMQQueueOptions>) {
    this.queueName = queueName;
    this.queue = new Queue<PayloadType>(queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // 7 days
          count: 1000,
        },
        removeOnFail: {
          age: 30 * 24 * 3600, // 30 days
        },
      },
      ...queueOptions,
    });
    console.log(`[BaseQueue] Initialized queue: ${queueName}`);
  }

  public getQueue(): Queue<PayloadType> {
    return this.queue;
  }

  /**
   * Add a job to the queue
   * @param name Job name (specific type for the job)
   * @param data Job data (typed payload)
   * @param options Job options
   */
  public async addJob(name: string, data: PayloadType, options?: JobsOptions): Promise<Job<PayloadType>> {
    try {
      // @ts-expect-error - BullMQ's ExtractNameType can be overly strict with generic wrappers.
      // We ensure 'name' is a string and PayloadType matches the worker's expectation.
      const job = await this.queue.add(name as unknown as string, data, options);
      console.log(`[BaseQueue/${this.queueName}] Added job '${name}' with ID ${job.id}`);
      return job as Job<PayloadType>;
    } catch (error) {
      console.error(`[BaseQueue/${this.queueName}] Failed to add job '${name}':`, error);
      throw error;
    }
  }
}
