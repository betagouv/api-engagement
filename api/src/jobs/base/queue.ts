import { Queue } from "bullmq";
import { redisConnection } from "../../db/redis";

/**
 * Base class for all queues
 * Implements the singleton pattern and provides common methods
 */
export abstract class BaseQueue {
  protected queue: Queue;

  protected queueName: string;

  protected constructor(queueName: string) {
    this.queueName = queueName;
    this.queue = new Queue(queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // 7 days
          count: 100, // Keep the last 100 jobs
        },
        removeOnFail: false, // Keep failed jobs for debugging
      },
    });
  }

  public getQueue(): Queue {
    return this.queue;
  }

  /**
   * Add a job to the queue
   * @param name Job name
   * @param data Job data
   * @param options Job options
   */
  public async addJob(name: string, data: any, options: any = {}): Promise<any> {
    try {
      const job = await this.queue.add(name, data, options);
      return job;
    } catch (error) {
      console.error(`[BaseQueue] Failed to add job '${name}' to queue '${this.queueName}':`, error);
      throw error;
    }
  }

  /**
   * Schedule a recurring job
   * @param name Job name
   * @param data Job data
   * @param cronExpression Cron expression for scheduling
   * @param jobId Unique job ID (to find/schedule the job)
   */
  public async scheduleRecurringJob(name: string, data: any, cronExpression: string, jobId: string): Promise<any> {
    return this.queue.add(name, data, {
      jobId,
      repeat: {
        pattern: cronExpression,
      },
    });
  }
}
