import { SLACK_LBC_CHANNEL_ID } from "../../config";
import missionJobBoardService from "../../services/mission-jobboard";
import { postMessage } from "../../services/slack";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";

export interface LeboncoinJobPayload {}

export interface LeboncoinJobResult extends JobResult {}

const ERROR_TYPES = {
  TYPE: {
    regex: "n'est pas du bon type",
    label: "Erreur dans le type d'image",
  },
  CITY_NOT_FOUND: {
    regex: "L'annonce que vous essayez de diffuser possède une ville ou un code postal non présent dans le référentiel du site.",
    label: "Erreur dans la ville ou le code postal",
  },
} as { [key: string]: { regex: string; label: string } };

export class LeboncoinHandler implements BaseHandler<LeboncoinJobPayload, LeboncoinJobResult> {
  name = "Alertes Leboncoin";

  async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();
    console.log(`[Leboncoin] Starting at ${start.toISOString()}`);

    const jobBoardEntries = await missionJobBoardService.findByJobBoard("LEBONCOIN", "ERROR");
    const refusedMissionIds = jobBoardEntries.map((entry) => entry.missionId);
    const uniqueRefusedIds = Array.from(new Set(refusedMissionIds));
    const count = uniqueRefusedIds.length;

    console.log(`[Leboncoin] Found ${count} missions refused`);

    const commentsAgg = new Map<string, number>();
    for (const entry of jobBoardEntries) {
      if (entry.syncStatus !== "ERROR") {
        continue;
      }
      const comment = entry.comment || "N/A";
      commentsAgg.set(comment, (commentsAgg.get(comment) ?? 0) + 1);
    }
    console.log(`[Leboncoin] Found ${commentsAgg.size} different comments for missions refused`);

    let text = `Alerte détectée: *${count} missions refusées* par leboncoin`;

    commentsAgg.forEach((aggCount, comment) => {
      const errorType = Object.values(ERROR_TYPES).find((type) => comment.includes(type.regex));
      if (errorType) {
        text += `\n- *${aggCount}* ${errorType.label}`;
      } else {
        text += `\n- *${aggCount}* ${comment}`;
      }
    });

    await postMessage({ text }, SLACK_LBC_CHANNEL_ID);
    console.log(`[Leboncoin] Ended at ${new Date().toISOString()}`);

    return {
      success: true,
      timestamp: new Date(),
      message: `\t• Nombre de missions refusées: ${count}`,
    };
  }
}
