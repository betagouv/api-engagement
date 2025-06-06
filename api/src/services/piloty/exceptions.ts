/**
 * Error thrown by PilotyClient
 * Use HTTP status code to determine error type
 */
export class PilotyError extends Error {
  status: number;

  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "PilotyError";
    this.status = status;
    this.body = body;
  }
}
