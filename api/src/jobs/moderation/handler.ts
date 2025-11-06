import { PUBLISHER_IDS } from "../../config";
import { captureException } from "../../error";
import { publisherService } from "../../services/publisher";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { createModerations, findMissions } from "./utils";

export interface ModerationJobPayload {}

export interface ModerationJobResult extends JobResult {
  moderators?: {
    name: string;
    updated: number;
    events: number;
    refused: number;
    pending: number;
  }[];
}

/*
Here the job is to update the moderation status of the jva partners.
The issue here is that the moderation was built to be open to all partners, 
but we know only JVA is using it.
Would have been better to directly have a moderation_jva collection.
*/
export class ModerationHandler implements BaseHandler<ModerationJobPayload, ModerationJobResult> {
  name = "Modération des missions JVA";

  async handle(): Promise<ModerationJobResult> {
    try {
      const start = new Date();
      console.log(`[Moderation JVA] Starting at ${start.toISOString()}`);

      const jva = await publisherService.findOnePublisherById(PUBLISHER_IDS.JEVEUXAIDER);

      if (!jva) {
        throw new Error("JVA not found");
      }

      const result = [] as ModerationJobResult["moderators"];

      if (!jva.publishers || !jva.publishers.length) {
        throw new Error("JVA has no publishers");
      }

      const data = await findMissions(jva);
      console.log(`[Moderation JVA] ${data.length} missions found in pending moderation yet`);

      if (!data.length) {
        return {
          success: true,
          timestamp: new Date(),
          moderators: result,
          message: "No missions found in pending moderation yet",
        };
      }

      const res = await createModerations(data, jva);
      result?.push({
        name: jva.name,
        updated: res.updated,
        events: res.events,
        refused: res.refused,
        pending: res.pending,
      });
      console.log(`[Moderation JVA] ${res.updated} missions updated`);
      console.log(`[Moderation JVA] ${res.events} events created`);
      console.log(`[Moderation JVA] Ended at ${new Date().toISOString()}`);

      return {
        success: true,
        timestamp: new Date(),
        moderators: result,
        message: `\t• Nombre de missions traitées: ${data.length} (dont ${data.filter((e) => e[`moderation_${jva.id}_status`] === "PENDING").length} en attente de modération)\n\t• Nombre de missions refusées: ${res.refused}\n\t• Nombre de missions mises en attente de modération: ${res.pending}`,
      };
    } catch (error) {
      captureException(error);
      return {
        success: false,
        timestamp: new Date(),
      };
    }
  }
}
