import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { JobBoardId } from "../db/core";
import { captureMessage, INVALID_BODY, NOT_FOUND } from "../error";
import missionService from "../services/mission";
import missionJobBoardService from "../services/mission-jobboard";
import { PublisherRequest } from "../types/passport";

const router = Router();

/**
 * Webhook for Leboncoin
 * webhook called for each mission to give back a status of the moderation of the partner in front
 * doc here https://www.notion.so/jeveuxaider/Leboincoin-API-Feedback-de-l-API-Engagement-12672a322d508087ab8bf02951b534b8?pvs=4
 */
const SYNC_STATUS_MAP = {
  ad_online: "ONLINE",
  ad_edited: "ONLINE",
  ad_deleted: "OFFLINE",
  ad_rejected_technical: "ERROR",
  ad_rejected_moderation: "ERROR",
} as const;

const LEBONCOIN_STATUS_VALUES = ["ad_online", "ad_edited", "ad_deleted", "ad_rejected_technical", "ad_rejected_moderation"] as const;

router.post("/feedback", passport.authenticate(["leboncoin"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        partner_unique_reference: zod.string(),
        site: zod.string(),
        status: zod.enum(LEBONCOIN_STATUS_VALUES),
        url: zod.string().optional(),
        note: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      captureMessage("Invalid body", JSON.stringify(body.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const mission = await missionService.findOneMission(body.data.partner_unique_reference);

    if (!mission) {
      captureMessage("Mission not found", JSON.stringify(body.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    const syncStatus = SYNC_STATUS_MAP[body.data.status];

    await missionJobBoardService.upsert({
      jobBoardId: JobBoardId.LEBONCOIN,
      missionId: mission._id,
      missionAddressId: null,
      publicId: body.data.url ?? mission._id,
      syncStatus,
      comment: body.data.note ?? null,
    });

    return res.status(200).send({ result: { code: 200, message: "Success, ad status recorded" } });
  } catch (error) {
    next(error);
  }
});

export default router;
