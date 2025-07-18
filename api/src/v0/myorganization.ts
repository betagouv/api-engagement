import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_BODY, INVALID_PARAMS } from "../error";
import MissionModel from "../models/mission";
import OrganizationExclusionModel from "../models/organization-exclusion";
import PublisherModel from "../models/publisher";
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
      route: `/v0/myorganisation${req.route.path}`,
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

router.get("/:organizationClientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;

    const params = zod
      .object({
        organizationClientId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const publishers = await PublisherModel.find({
      "publishers.publisherId": user._id.toString(),
    });
    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedByPublisherId: user._id.toString(),
    });

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const aggs = await esClient.search({
      index: STATS_INDEX,

      body: {
        query: {
          bool: {
            filter: [
              { term: { "type.keyword": "click" } },
              { terms: { "fromPublisherId.keyword": publishers.map((e) => e._id.toString()) } },
              { term: { missionOrganizationClientId: params.data.organizationClientId } },
              { range: { createdAt: { gte: oneMonthAgo.toISOString() } } },
            ],
            must_not: [{ term: { isBot: true } }],
          },
        },
        aggs: {
          fromPublisherId: {
            terms: { field: "fromPublisherId.keyword", size: publishers.length },
          },
        },
      },
    });

    const data = [] as any[];
    publishers.forEach((e) => {
      const isExcluded = organizationExclusions.some((o) => o.organizationClientId === params.data.organizationClientId && o.excludedForPublisherId === e._id.toString());
      const clicks = aggs.body.aggregations?.fromPublisherId?.buckets?.find((o: { key: string; doc_count: number }) => o.key === e._id.toString())?.doc_count || 0;
      data.push({
        _id: e._id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.hasWidgetRights,
        api: e.hasApiRights,
        campaign: e.hasCampaignRights,
        annonceur: e.isAnnonceur,
        excluded: isExcluded,
        clicks,
      });
    });
    return res.status(200).send({
      ok: true,
      data: data.filter((e) => e !== null),
      total: data.filter((e) => e !== null).length,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:organizationClientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;

    const params = zod
      .object({
        organizationClientId: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        organizationName: zod.string().optional().nullable(),
        publisherIds: zod.array(zod.string()),
      })
      .safeParse(req.body);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!body.success) {
      res.locals = { code: INVALID_BODY, message: JSON.stringify(body.error) };
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const publishers = await PublisherModel.find({
      "publishers.publisherId": user._id.toString(),
    });

    if (!body.data.organizationName) {
      const organization = await MissionModel.findOne({
        organizationClientId: params.data.organizationClientId,
        organizationName: { $exists: true },
      }).select("organizationName");
      if (organization) {
        body.data.organizationName = organization.organizationName;
      }
    }

    await OrganizationExclusionModel.deleteMany({
      excludedByPublisherId: user._id.toString(),
      organizationClientId: params.data.organizationClientId,
    });

    const bulk: any[] = [];
    publishers
      .filter((e) => !body.data.publisherIds.includes(e._id.toString()))
      .forEach((e) => {
        bulk.push({
          excludedByPublisherId: user._id.toString(),
          excludedByPublisherName: user.name,
          excludedForPublisherId: e._id.toString(),
          excludedForPublisherName: e.name,
          organizationClientId: params.data.organizationClientId,
          organizationName: body.data.organizationName || "",
        });
      });

    await OrganizationExclusionModel.insertMany(bulk);

    const newOrganizationExclusions = await OrganizationExclusionModel.find({
      excludedByPublisherId: user._id.toString(),
      organizationClientId: params.data.organizationClientId,
    });

    const data = [] as any[];
    publishers.forEach((e) => {
      const isExcluded = newOrganizationExclusions.some((o) => o.excludedForPublisherId === e._id.toString());
      data.push({
        _id: e._id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.hasWidgetRights,
        api: e.hasApiRights,
        campaign: e.hasCampaignRights,
        annonceur: e.isAnnonceur,
        excluded: isExcluded,
      });
    });

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

export default router;
