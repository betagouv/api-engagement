import { SLACK_LBC_CHANNEL_ID } from "../../config";
import MissionModel from "../../models/mission";
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
  async handle(): Promise<LeboncoinJobResult> {
    const start = new Date();
    console.log(`[Leboncoin] Starting at ${start.toISOString()}`);

    const count = await MissionModel.countDocuments({
      leboncoinStatus: "REFUSED",
      deletedAt: null,
    });
    console.log(`[Leboncoin] Found ${count} missions refused`);

    const aggs = await MissionModel.aggregate([{ $match: { leboncoinStatus: "REFUSED", deletedAt: null } }, { $group: { _id: "$leboncoinComment", count: { $sum: 1 } } }]);
    console.log(`[Leboncoin] Found ${aggs.length} different comments for missions refused`);

    let text = `Alerte détectée: *${count} missions refusées* par leboncoin`;

    aggs.forEach((agg) => {
      const errorType = Object.values(ERROR_TYPES).find((type) => agg._id.includes(type.regex));
      if (errorType) {
        text += `\n- *${agg.count}* ${errorType.label}`;
      } else {
        text += `\n- *${agg.count}* ${agg._id}`;
      }
    });

    text += `\n\nVoir et exporter les missions refusées: https://app.api-engagement.beta.gouv.fr/admin-mission?leboncoinStatus=REFUSED`;

    await postMessage({ text }, SLACK_LBC_CHANNEL_ID);
    console.log(`[Leboncoin] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

    return {
      success: true,
      timestamp: new Date(),
    };
  }
}
