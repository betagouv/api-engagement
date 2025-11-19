import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY } from "../error";
import RequestModel from "../models/request";
import { statEventService } from "../services/stat-event";
import { PublisherRequest } from "../types/passport";
import type { ViewStatsFacetField } from "../types/stat-event";
import type { PublisherRecord } from "../types/publisher";

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
    const user = req.user as PublisherRecord;
    const query = zod
      .object({
        fromPublisherId: zod.string().optional(),
        toPublisherId: zod.string().optional(),
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

    const createdAtFilters: { operator: "gt" | "lt"; date: Date }[] = [];
    if (query.data.createdAt) {
      const createdAtValues = Array.isArray(query.data.createdAt) ? query.data.createdAt : [query.data.createdAt];
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

    const facets = (query.data.facets
      ? query.data.facets
          .split(",")
          .map((facet) => facet.trim())
          .filter((facet) => facet.length)
      : []) as ViewStatsFacetField[];

    const { total, facets: facetBuckets } = await statEventService.findStatEventViews({
      publisherId: user.id,
      size: query.data.size,
      filters: {
        fromPublisherId: query.data.fromPublisherId || undefined,
        toPublisherId: query.data.toPublisherId || undefined,
        missionDomain: query.data.missionDomain || undefined,
        type: query.data.type || undefined,
        source: query.data.source || undefined,
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
