import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_BODY } from "../error";
import { EsQuery } from "../types";
import { UserRequest } from "../types/passport";

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

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    if (!body.data.fromPublisherId && !body.data.toPublisherId) return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Missing fromPublisherId or toPublisherId" });

    const where = { bool: { must: [], must_not: [{ term: { isBot: true } }], should: [], filter: [] } } as EsQuery;

    if (body.data.fromPublisherId) where.bool.filter.push({ term: { fromPublisherId: body.data.fromPublisherId } });
    if (body.data.toPublisherId) where.bool.filter.push({ term: { toPublisherId: body.data.toPublisherId } });
    if (body.data.type) where.bool.filter.push({ term: { type: body.data.type.toString() } });
    if (body.data.sourceId) where.bool.filter.push({ term: { sourceId: body.data.sourceId } });

    const response = await esClient.search({
      index: STATS_INDEX,
      body: {
        track_total_hits: true,
        query: where,
        sort: [{ createdAt: { order: "desc" } }],
        size: body.data.size,
        from: body.data.skip,
      },
    });
    if (response.statusCode !== 200) next(response.body.error);

    const data = response.body.hits.hits.map((h: any) => ({ ...h._source, id: h._id }));
    const total = response.body.hits.total.value;
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
