import { Job } from "bullmq";
import { JobResult, JobScheduleFunction } from "../types";
import { BaseQueue } from "./queue";

/**
 * Base interface for all job handlers.
 * Defines the contract for job processing and scheduling.
 */
export interface BaseHandler<PayloadType = any, ResultType extends JobResult = JobResult> {
  /**
   * A unique name for the job, often used for specific worker targeting.
   */
  readonly JOB_NAME: string;

  /**
   * The queue for this job
   */
  readonly queue: BaseQueue<PayloadType>;

  /**
   * The core logic for processing a job.
   * @param job The BullMQ job object, containing payload.
   * @returns A promise that resolves with a JobResult.
   */
  handle(job: Job<PayloadType>): Promise<ResultType>;

  /**
   * A function that, when called by the scheduler, adds the job in the queue (e.g., sets up cron or recurring tasks).
   */
  schedule: JobScheduleFunction;
}
