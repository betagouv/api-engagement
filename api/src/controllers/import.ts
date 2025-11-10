import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY } from "../error";
import { importService } from "../services/import";
import { UserRequest } from "../types/passport";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        publisherId: zod.string().optional(),
        skip: zod.number().min(0).max(10000).default(0),
        size: zod.number().min(1).max(100).default(25),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    if (req.user.role !== "admin" && (!body.data.publisherId || !req.user.publishers.includes(body.data.publisherId))) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const filters = {
      skip: body.data.skip,
      size: body.data.size,
      publisherId: body.data.publisherId,
    };

    const { data, total } = await importService.findImportsWithCount(filters);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
