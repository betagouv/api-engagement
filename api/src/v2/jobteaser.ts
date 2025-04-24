import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { MissionModel, RequestModel } from "@shared/models";

import { captureMessage, INVALID_BODY, NOT_FOUND } from "../error";
import { postMessage } from "../services/slack";
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
      route: `/v2/jobteaser${req.route.path}`,
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

router.post("/feedback", passport.authenticate(["jobteaser"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        missionId: zod.string(),
        status: zod.enum(["ACCEPTED", "PENDING", "DELETED", "REFUSED"]),
        url: zod.string().optional(),
        comment: zod.string().optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) {
      captureMessage("Invalid body", JSON.stringify(body.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const mission = await MissionModel.findOne({ _id: body.data.missionId });
    if (!mission) {
      captureMessage("Mission not found", JSON.stringify(body.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    if (body.data.status === "REFUSED") {
      await postMessage(
        {
          title: `Mission refusée sur JobTeaser`,
          text: `La mission ${mission.title} (${mission._id}) a été refusée sur JobTeaser\n\turl: https://app.api-engagement.beta.gouv.fr/mission/${mission._id}\n\tstatut: ${body.data.status}\n\traison: ${body.data.comment}`,
        },
        "C080H9MH56W",
      );
    }

    mission.jobteaserStatus = body.data.status;
    mission.jobteaserUrl = body.data.url;
    mission.jobteaserComment = body.data.comment;
    mission.jobteaserUpdatedAt = new Date();

    await mission.save();

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
