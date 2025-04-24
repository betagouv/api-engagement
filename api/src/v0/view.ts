import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";

import { RequestModel } from "@shared/models";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
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
    const { error: queryError, value: query } = Joi.object({
      fromPublisherId: Joi.string().allow("").optional(),
      toPublisherId: Joi.string().allow("").optional(),
      fromPublisherName: Joi.string().allow("").optional(),
      toPublisherName: Joi.string().allow("").optional(),
      missionDomain: Joi.string().allow("").optional(),
      type: Joi.string().allow("").optional(),
      source: Joi.string().allow("").optional(),
      createdAt: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())).allow("").optional(),
      size: Joi.number().min(1).max(10000).default(10),
      facets: Joi.string().allow("").optional(),
    }).validate(req.query);

    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: queryError.details });

    const where = {
      query: {
        bool: {
          must_not: [{ term: { isBot: true } }],
          must: [],
          should: [{ term: { "toPublisherId.keyword": req.user._id } }, { term: { "fromPublisherId.keyword": req.user._id } }],
          filter: [],
        },
      },
      size: query.size,
      track_total_hits: true,
    } as { [key: string]: any };

    if (query.fromPublisherName) where.query.bool.must.push({ term: { "fromPublisherName.keyword": query.fromPublisherName } });
    if (query.toPublisherName) where.query.bool.must.push({ term: { "toPublisherName.keyword": query.toPublisherName } });

    if (query.fromPublisherId) where.query.bool.must.push({ term: { "fromPublisherId.keyword": query.fromPublisherId } });
    if (query.toPublisherId) where.query.bool.must.push({ term: { "toPublisherId.keyword": query.toPublisherId } });

    if (query.missionDomain) where.query.bool.must.push({ term: { "missionDomain.keyword": query.missionDomain } });
    if (query.type) where.query.bool.must.push({ term: { "type.keyword": query.type } });
    if (query.source) where.query.bool.must.push({ term: { "source.keyword": query.source } });

    if (query.createdAt) {
      const createdAt = Array.isArray(query.createdAt) ? query.createdAt : [req.query.createdAt];
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

    if (query.facets) {
      const size = query.size || 10;
      const aggregations = query.facets.split(",");
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
