import { BaseWorker } from "../base/worker";
import { QueueNames } from "../config";
import { JOB_NAME } from "./";
import { handler } from "./handler";

/**
 * Worker for letudiant.fr feed generation
 */
export class Worker extends BaseWorker {
  protected static instance: Worker;

  private constructor() {
    super(QueueNames.LETUDIANT, JOB_NAME, handler);
  }

  /**
   * Singleton pattern to avoid multiple workers
   */
  public static getInstance(): Worker {
    if (!Worker.instance) {
      Worker.instance = new Worker();
    }
    return Worker.instance;
  }
}
