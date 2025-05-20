import { BaseQueue } from "../base/queue";
import { QueueNames } from "../config";
import { JOB_NAME } from "./";

/**
 * Queue for letudiant.fr feed generation
 */
export class Queue extends BaseQueue {
  private static instance: Queue;

  private constructor() {
    super(QueueNames.LETUDIANT);
  }

  // Singleton pattern to avoid multiple queues
  public static getInstance(): Queue {
    if (!Queue.instance) {
      Queue.instance = new Queue();
    }
    return Queue.instance;
  }

  /**
   * Generate the feed
   * @param options Options for the feed generation
   */
  public async generateFeed(options?: any): Promise<any> {
    const result = await this.addJob(
      JOB_NAME,
      { timestamp: Date.now(), options },
      {
        jobId: `${JOB_NAME}-${Date.now()}`,
      }
    );
    return result;
  }

  /**
   * Schedule the feed generation
   * @param cronExpression Expression cron for the schedule (default: every day at 2am)
   */
  public async scheduleFeedGeneration(cronExpression: string): Promise<any> {
    return this.scheduleRecurringJob(JOB_NAME, { scheduled: true }, cronExpression, `${JOB_NAME}-scheduled`);
  }
}
