import { BaseQueue } from "../base/queue";
import { QueueNames } from "../config";

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
    return this.addJob(
      "generate-feed",
      { timestamp: Date.now(), options },
      {
        jobId: `letudiant-feed-${Date.now()}`,
      }
    );
  }

  /**
   * Schedule the feed generation
   * @param cronExpression Expression cron for the schedule (default: every day at 2am)
   */
  public async scheduleFeedGeneration(cronExpression: string): Promise<any> {
    return this.scheduleRecurringJob("generate-feed", { scheduled: true }, cronExpression, "scheduled-letudiant-feed");
  }
}
