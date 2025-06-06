import { Processor } from "bullmq";

/**
 * Configuration for a single job worker.
 */
export interface WorkerConfig<PayloadType = any> {
  queueName: string;
  processor: Processor<PayloadType>;
  name?: string; // Optional: if the worker processes only specific named jobs in the queue
}

/**
 * Defines the signature for a function that can be scheduled.
 */
export type JobScheduleFunction = () => Promise<any>;

/**
 * Configuration for a scheduled job.
 * This is a placeholder based on previous context.
 */
export interface JobSchedule {
  title: string;
  cronExpression: string;
  function: JobScheduleFunction;
}

/**
 * Base result structure for job handlers.
 */
export interface JobResult {
  success: boolean;
  timestamp: Date;
  message?: string;
  error?: string; // Optional error message
  details?: Record<string, any>; // Optional additional details
}

/**
 * Base Job Result
 * Inherit from this interface to create specific job results
 */
export interface JobResult {
  success: boolean;
  timestamp: Date;
}
