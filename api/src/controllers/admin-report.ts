import { Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "../error";
import ReportModel from "../models/report";

const router = Router();

router.post("/search", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const body = zod
      .object({
        error: zod.string().optional(),
        publisherId: zod.string().optional(),
        month: zod.coerce.number().optional(),
        year: zod.coerce.number().optional(),
        size: zod.coerce.number().min(1).max(100).default(25),
        from: zod.coerce.number().min(0).default(0),
        sortBy: zod.enum(["createdAt", "publisherName", "sentAt"]).default("createdAt"),
      })
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error.errors });

    const where = {} as any;
    if (body.data.error) where.error = body.data.error;
    if (body.data.publisherId) where.publisherId = body.data.publisherId;
    if (body.data.month) where.month = body.data.month;
    if (body.data.year) where.year = body.data.year;

    const sort = {} as any;
    sort[body.data.sortBy] = -1;

    const total = await ReportModel.countDocuments(where);
    const data = await ReportModel.find(where).limit(body.data.size).skip(body.data.from).sort(sort);
    const facets = await ReportModel.aggregate([
      { $match: where },
      {
        $facet: {
          publishers: [{ $group: { _id: "$publisherId", count: { $sum: 1 }, name: { $first: "$publisherName" } } }],
          status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]);

    const aggs = {
      publishers: facets[0].publishers,
      status: facets[0].status.filter((e: any) => e._id),
    };

    return res.status(200).send({ ok: true, data, aggs, total });
  } catch (error) {
    next(error);
  }
});

export default router;
