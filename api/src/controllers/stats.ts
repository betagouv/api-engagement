import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { UserRequest } from "@/types/passport";
import { statEventService } from "@/services/stat-event";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        sourceId: zod.string().optional(),
        // publisherId: zod.string(),
        fromPublisherId: zod.string().optional(),
        toPublisherId: zod.string().optional(),
        size: zod.coerce.number().default(25),
        skip: zod.coerce.number().default(0),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }
    if (!body.data.fromPublisherId && !body.data.toPublisherId) {
      return res.status(400).send({
        ok: false,
        code: INVALID_BODY,
        error: "Missing fromPublisherId or toPublisherId",
      });
    }

    const events = await statEventService.findStatEvents({
      fromPublisherId: body.data.fromPublisherId,
      toPublisherId: body.data.toPublisherId,
      type: body.data.type,
      sourceId: body.data.sourceId,
      size: body.data.size,
      skip: body.data.skip,
    });

    const data = events.map(({ _id, ...rest }) => ({ ...rest, id: _id }));
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
