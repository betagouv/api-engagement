import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, NOT_FOUND } from "../error";
import { moderationEventService } from "../services/moderation-event";
import { UserRequest } from "../types/passport";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        missionId: zod.string(),
        moderatorId: zod.string(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const where = {} as { [key: string]: string };
    if (body.data.missionId) {
      where.missionId = body.data.missionId;
    }
    if (body.data.moderatorId) {
      where.moderatorId = body.data.moderatorId;
    }

    const data = await moderationEventService.findModerationEvents(where);
    if (!data) {
      return res.status(404).send({
        ok: false,
        code: NOT_FOUND,
        message: "No moderation events found for this moderationId",
      });
    }
    const total = data.length;

    if (!data) {
      return res.status(404).send({
        ok: false,
        code: "NOT_FOUND",
        message: "No moderation events found for this moderationId",
      });
    }

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
