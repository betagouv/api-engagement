import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { syncContact } from "./utils";

export interface BrevoJobPayload {}

export interface BrevoJobResult extends JobResult {}

export class BrevoHandler implements BaseHandler<BrevoJobPayload, BrevoJobResult> {
  async handle(): Promise<BrevoJobResult> {
    const start = new Date();
    console.log(`[Brevo] Starting at ${start.toISOString()}`);

    await syncContact();

    console.log(`[Brevo] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

    return {
      success: true,
      timestamp: new Date(),
    };
  }
}
