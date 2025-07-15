import { SLACK_CRON_CHANNEL_ID } from "../../config";
import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import { postMessage } from "../../services/slack";
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
  async handle(): Promise<ModerationJobResult> {
    try {
      const start = new Date();
      console.log(`[Moderation] Starting at ${start.toISOString()}`);

      const moderators = await PublisherModel.find({ moderator: true });
      const result = [] as ModerationJobResult["moderators"];

      for (let i = 0; i < moderators.length; i++) {
        const moderator = moderators[i];

        if (!moderator.publishers || !moderator.publishers.length) {
          continue;
        }

        console.log(`[Moderation] Starting for ${moderator.name} (${moderator._id}), number ${i + 1}/${moderators.length}`);

        const data = await findMissions(moderator);
        console.log(`[Moderation] - ${moderator.name} ${data.length} found in pending moderation yet`);

        if (!data.length) {
          continue;
        }

        const res = await createModerations(data, moderator);
        result?.push({
          name: moderator.name,
          updated: res.updated,
          events: res.events,
          refused: res.refused,
          pending: res.pending,
        });
        console.log(`[Moderation] ${moderator.name} ${res.updated} missions updated`);
        console.log(`[Moderation] ${moderator.name} ${res.events} events created`);

        await postMessage(
          {
            title: `Moderation ${moderator.name} completed`,
            text: `Mission updated: ${res.updated}, Events created: ${res.events}, Missions refused: ${res.refused}, Missions pending: ${res.pending}`,
          },
          SLACK_CRON_CHANNEL_ID
        );
      }
      console.log(`[Moderation] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

      return {
        success: true,
        timestamp: new Date(),
        moderators: result,
      };
    } catch (err) {
      captureException(err);
      return {
        success: false,
        timestamp: new Date(),
      };
    }
  }
}
