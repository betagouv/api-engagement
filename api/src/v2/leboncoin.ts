import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { captureMessage, INVALID_BODY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import RequestModel from "../models/request";
import { postMessage } from "../services/slack";
import { Mission } from "../types";
import { PublisherRequest } from "../types/passport";

const router = Router();

/**
 * Webhook for Leboncoin
 * webhook called for each mission to give back a status of the moderation of the partner in front
 * doc here https://www.notion.so/jeveuxaider/Leboincoin-API-Feedback-de-l-API-Engagement-12672a322d508087ab8bf02951b534b8?pvs=4
 */

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v2/leboncoin${req.route.path}`,
      query: req.query,
      params: req.params,
      body: req.body,
      status: res.statusCode,
      code: res.locals.code,
      message: res.locals.message,
      total: res.locals.total,
    });
    await request.save();
  });
  next();
});

const STATUS_MAP = {
  ad_online: "ACCEPTED",
  ad_edited: "EDITED",
  ad_deleted: "DELETED",
  ad_rejected_technical: "REFUSED_TECHNICAL",
  ad_rejected_moderation: "REFUSED_MODERATION",
} as { [key: string]: "ACCEPTED" | "EDITED" | "DELETED" | "REFUSED_TECHNICAL" | "REFUSED_MODERATION" };

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
      .passthrough()
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

    if (STATUS_MAP[body.data.status].includes("REFUSED") && STATUS_MAP[body.data.status] !== mission.leboncoinStatus) {
      await postMessage(
        {
          title: `Mission refusée sur Leboncoin`,
          text: `La mission ${mission.title} (${mission._id}) a été refusée sur Leboncoin\n\turl: https://app.api-engagement.beta.gouv.fr/mission/${mission._id}\n\tstatut: ${body.data.status}\n\traison: ${body.data.note}`,
        },
        "C07SPFG724V",
      );
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
