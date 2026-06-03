export class WorkerRetryableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "WorkerRetryableError";
  }
}
