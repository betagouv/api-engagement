import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";

import { INVALID_QUERY } from "../error";
import RequestModel from "../models/request";
import { Publisher } from "../types";
import { PublisherRequest } from "../types/passport";
import statEventRepository from "../repositories/stat-event";

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

    if (queryError) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: queryError.details });
    }

    const createdAtFilters: { operator: "gt" | "lt"; date: Date }[] = [];
    if (query.createdAt) {
      const createdAtValues = Array.isArray(query.createdAt) ? query.createdAt : [query.createdAt];
      createdAtValues
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .forEach((value) => {
          if (value.startsWith("gt:")) {
            const date = new Date(value.replace("gt:", ""));
            if (!Number.isNaN(date.getTime())) {
              createdAtFilters.push({ operator: "gt", date });
            }
          }
          if (value.startsWith("lt:")) {
            const date = new Date(value.replace("lt:", ""));
            if (!Number.isNaN(date.getTime())) {
              createdAtFilters.push({ operator: "lt", date });
            }
          }
        });
    }

    const facets = query.facets
      ? query.facets
          .split(",")
          .map((facet) => facet.trim())
          .filter((facet) => facet.length)
      : [];

    const { total, facets: facetBuckets } = await statEventRepository.searchViewStats({
      publisherId: user._id.toString(),
      size: query.size,
      filters: {
        fromPublisherName: query.fromPublisherName || undefined,
        toPublisherName: query.toPublisherName || undefined,
        fromPublisherId: query.fromPublisherId || undefined,
        toPublisherId: query.toPublisherId || undefined,
        missionDomain: query.missionDomain || undefined,
        type: query.type || undefined,
        source: query.source || undefined,
        createdAt: createdAtFilters.length ? createdAtFilters : undefined,
      },
      facets,
    });

    res.locals = { total };
    return res.status(200).send({ total, facets: facetBuckets });
  } catch (error) {
    next(error);
  }
});

export default router;
