import { JobResult } from "@/jobs/types";

/**
 * Base interface for all job handlers.
 * Defines the contract for job processing.
 */
export interface BaseHandler<PayloadType = any, ResultType extends JobResult = JobResult> {
  /**
   * The core logic for processing a job.
   * @param payload The payload of the job.
   * @returns A promise that resolves with a JobResult.
   */
  name: string;
  handle(payload: PayloadType): Promise<ResultType | undefined>;
}
