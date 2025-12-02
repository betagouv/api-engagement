import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { captureMessage, INVALID_BODY, NOT_FOUND } from "../error";
import missionService from "../services/mission";
import { PublisherRequest } from "../types/passport";

const router = Router();

/**
 * Webhook for Leboncoin
 * webhook called for each mission to give back a status of the moderation of the partner in front
 * doc here https://www.notion.so/jeveuxaider/Leboincoin-API-Feedback-de-l-API-Engagement-12672a322d508087ab8bf02951b534b8?pvs=4
 */
const STATUS_MAP = {
  ad_online: "ACCEPTED",
  ad_edited: "EDITED",
  ad_deleted: "DELETED",
  ad_rejected_technical: "REFUSED",
  ad_rejected_moderation: "REFUSED",
} as { [key: string]: "ACCEPTED" | "EDITED" | "DELETED" | "REFUSED" };

router.post("/feedback", passport.authenticate(["leboncoin"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        partner_unique_reference: zod.string(),
        site: zod.string(),
        status: zod.string(),
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

    await missionService.update(body.data.partner_unique_reference, {
      leboncoinStatus: STATUS_MAP[body.data.status],
      leboncoinUrl: body.data.url,
      leboncoinComment: body.data.note,
      leboncoinUpdatedAt: new Date(),
    });

    return res.status(200).send({ result: { code: 200, message: "Success, ad status recorded" } });
  } catch (error) {
    next(error);
  }
});

export default router;
