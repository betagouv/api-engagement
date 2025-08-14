/**
 * Base Job Result
 * Inherit from this interface to create specific job results
 */
export interface JobResult {
  success: boolean;
  timestamp: Date;
  message?: string;
}
