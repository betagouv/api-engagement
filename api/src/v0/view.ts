import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import RequestModel from "../models/request";
import { Publisher } from "../types";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) {
      return;
    }
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v0/view${req.route.path}`,
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

router.get("/stats", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;
    const query = zod
      .object({
        fromPublisherId: zod.string().optional(),
        toPublisherId: zod.string().optional(),
        fromPublisherName: zod.string().optional(),
        toPublisherName: zod.string().optional(),
        missionDomain: zod.string().optional(),
        type: zod.string().optional(),
        source: zod.string().optional(),
        createdAt: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        size: zod.coerce.number().min(1).max(10000).default(10),
        facets: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const where = {
      query: {
        bool: {
          must_not: [{ term: { isBot: true } }],
          must: [],
          should: [{ term: { "toPublisherId.keyword": user._id } }, { term: { "fromPublisherId.keyword": user._id } }],
          filter: [],
        },
      },
      size: query.data.size,
      track_total_hits: true,
    } as { [key: string]: any };

    if (query.data.fromPublisherName) {
      where.query.bool.must.push({
        term: { "fromPublisherName.keyword": query.data.fromPublisherName },
      });
    }
    if (query.data.toPublisherName) {
      where.query.bool.must.push({ term: { "toPublisherName.keyword": query.data.toPublisherName } });
    }

    if (query.data.fromPublisherId) {
      where.query.bool.must.push({ term: { "fromPublisherId.keyword": query.data.fromPublisherId } });
    }
    if (query.data.toPublisherId) {
      where.query.bool.must.push({ term: { "toPublisherId.keyword": query.data.toPublisherId } });
    }

    if (query.data.missionDomain) {
      where.query.bool.must.push({ term: { "missionDomain.keyword": query.data.missionDomain } });
    }
    if (query.data.type) {
      where.query.bool.must.push({ term: { "type.keyword": query.data.type } });
    }
    if (query.data.source) {
      where.query.bool.must.push({ term: { "source.keyword": query.data.source } });
    }

    if (query.data.createdAt) {
      const createdAt = Array.isArray(query.data.createdAt) ? query.data.createdAt : [query.data.createdAt];
      for (let i = 0; i < createdAt.length; i++) {
        if (createdAt[i].startsWith("gt:")) {
          const date = new Date(createdAt[i].replace("gt:", ""));
          where.query.bool.must.push({ range: { createdAt: { gt: date } } });
        }
        if (createdAt[i].startsWith("lt:")) {
          const date = new Date(createdAt[i].replace("lt:", ""));
          where.query.bool.must.push({ range: { createdAt: { lt: date } } });
        }
      }
    }

    if (query.data.facets) {
      const size = query.data.size || 10;
      const aggregations = query.data.facets.split(",");
      where.aggs = {};
      for (let i = 0; i < aggregations.length; i++) {
        where.aggs[aggregations[i]] = { terms: { field: `${aggregations[i]}.keyword`, size } };
      }
    }

    const response = await esClient.search({ index: STATS_INDEX, body: where });

    const total = response.body.hits.total.value;
    const facets = {} as { [key: string]: any };
    for (let i = 0; i < Object.keys(response.body.aggregations || {}).length; i++) {
      const key = Object.keys(response.body.aggregations)[i];
      facets[key] = response.body.aggregations[key].buckets;
    }

    res.locals = { total };
    return res.status(200).send({ total, facets });
  } catch (error) {
    next(error);
  }
});

export default router;
