import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, NOT_FOUND } from "../error";
import ModerationEventModel from "../models/moderation-event";
import { ModerationEvent } from "../types";
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

    const data = await ModerationEventModel.find(where).sort({ createdAt: 1 }).lean();
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

    return res.status(200).send({ ok: true, data: data.map(buildData), total });
  } catch (error) {
    next(error);
  }
});

const buildData = (data: ModerationEvent) => {
  return {
    ...data,
    initialNote: data.initialNote || null,
    newNote: data.newNote || null,
    newStatus: data.newStatus || null,
    initialStatus: data.initialStatus || null,
    newTitle: data.newTitle || null,
    initialTitle: data.initialTitle || null,
    newSiren: data.newSiren || null,
    initialSiren: data.initialSiren || null,
    newRNA: data.newRNA || null,
    initialRNA: data.initialRNA || null,
    userName: data.userName || null,
    userId: data.userId || null,
    newComment: data.newComment || null,
    initialComment: data.initialComment || null,
  };
};

export default router;
