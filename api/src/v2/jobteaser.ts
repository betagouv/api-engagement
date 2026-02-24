import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { SLACK_JOBTEASER_CHANNEL_ID } from "@/config";
import { JobBoardId } from "@/db/core";
import { INVALID_BODY, NOT_FOUND } from "@/error";
import { missionService } from "@/services/mission";
import missionJobBoardService from "@/services/mission-jobboard";
import { postMessage } from "@/services/slack";
import { PublisherRequest } from "@/types/passport";

const router = Router();

const SYNC_STATUS_MAP = {
  ACCEPTED: "ONLINE",
  PENDING: "OFFLINE",
  DELETED: "OFFLINE",
  REFUSED: "OFFLINE",
} as const;

const JOBTEASER_STATUS_VALUES = ["ACCEPTED", "PENDING", "DELETED", "REFUSED"] as const;

/**
 * Webhook for JobTeaser
 * webhook called for each mission to give back a status of the moderation of the partner in front
 * doc here https://www.notion.so/jeveuxaider/Leboincoin-API-Feedback-de-l-API-Engagement-12672a322d508087ab8bf02951b534b8?pvs=4
 */
router.post("/feedback", passport.authenticate(["jobteaser"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        missionId: zod.string(),
        status: zod.enum(JOBTEASER_STATUS_VALUES),
        url: zod.string().optional(),
        comment: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const mission = await missionService.findOneMission(body.data.missionId);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    if (body.data.status === "REFUSED") {
      await postMessage(
        {
          title: `Mission refusée sur JobTeaser`,
          text: `La mission ${mission.title} (${mission._id}) a été refusée sur JobTeaser\n\turl: https://app.api-engagement.beta.gouv.fr/mission/${mission._id}\n\tstatut: ${body.data.status}\n\traison: ${body.data.comment}`,
        },
        SLACK_JOBTEASER_CHANNEL_ID
      );
    }

    const syncStatus = SYNC_STATUS_MAP[body.data.status];

    await missionJobBoardService.upsert({
      jobBoardId: JobBoardId.JOBTEASER,
      missionId: mission._id,
      missionAddressId: null,
      publicId: body.data.url ?? mission._id,
      syncStatus,
      comment: body.data.comment ?? null,
    });

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
