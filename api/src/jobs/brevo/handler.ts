import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { syncContact } from "./utils";

export interface BrevoJobPayload {}

export interface BrevoJobResult extends JobResult {}

export class BrevoHandler implements BaseHandler<BrevoJobPayload, BrevoJobResult> {
  name = "Sync des contacts Brevo";

  async handle(): Promise<BrevoJobResult> {
    const start = new Date();
    console.log(`[Brevo] Starting at ${start.toISOString()}`);

    const res = await syncContact();

    console.log(`[Brevo] Ended at ${new Date().toISOString()}`);

    return {
      success: true,
      timestamp: new Date(),
      message: `\t• Nombre de contacts supprimés: ${res.deleted}\n\t• Nombre de contacts créés: ${res.created}\n\t• Nombre de contacts mis à jour: ${res.updated}`,
    };
  }
}
