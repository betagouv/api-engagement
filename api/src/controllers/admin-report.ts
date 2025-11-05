import { Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "../error";
import { reportService } from "../services/report";

const router = Router();

router.post("/search", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const body = zod
      .object({
        status: zod.string().optional(),
        publisherId: zod.string().optional(),
        month: zod.coerce.number().optional(),
        year: zod.coerce.number().optional(),
        size: zod.coerce.number().min(1).max(100).default(25),
        from: zod.coerce.number().min(0).default(0),
        sortBy: zod.enum(["createdAt", "publisherName", "sentAt"]).default("createdAt"),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const result = await reportService.searchReports({
      status: body.data.status,
      publisherId: body.data.publisherId,
      month: body.data.month,
      year: body.data.year,
      size: body.data.size,
      from: body.data.from,
      sortBy: body.data.sortBy,
    });

    return res.status(200).send({ ok: true, data: result.data, aggs: result.aggs, total: result.total });
  } catch (error) {
    next(error);
  }
});

export default router;
