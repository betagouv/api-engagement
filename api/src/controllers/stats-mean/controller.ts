import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY } from "../../error";
import { UserRequest } from "../../types/passport";
import { getStatsMean } from "./helper";

const router = Router();

const querySchema = zod
  .object({
    publisherId: zod.string().optional(),
    from: zod.coerce.date().optional(),
    to: zod.coerce.date().optional(),
    source: zod.string().optional(),
  })
  .strict();

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getStatsMean(query.data);

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
