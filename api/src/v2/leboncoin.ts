import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { captureMessage, INVALID_BODY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import { Mission } from "../types";
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

    let mission = null as HydratedDocument<Mission> | null;
    if (body.data.partner_unique_reference.length === 24) {
      mission = await MissionModel.findOne({ _id: body.data.partner_unique_reference });
    } else {
      mission = await MissionModel.findOne({ _old_id: body.data.partner_unique_reference });
    }

    if (!mission) {
      captureMessage("Mission not found", JSON.stringify(body.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    mission.leboncoinStatus = STATUS_MAP[body.data.status];
    mission.leboncoinUrl = body.data.url;
    mission.leboncoinComment = body.data.note;
    mission.leboncoinUpdatedAt = new Date();

    await mission.save();

    return res.status(200).send({ result: { code: 200, message: "Success, ad status recorded" } });
  } catch (error) {
    next(error);
  }
});

export default router;
