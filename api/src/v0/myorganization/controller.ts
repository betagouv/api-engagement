import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS } from "../../error";
import MissionModel from "../../models/mission";
import OrganizationExclusionModel from "../../models/organization-exclusion";
import RequestModel from "../../models/request";
import { statEventService } from "../../services/stat-event";
import { publisherService } from "../../services/publisher";
import type { PublisherRecord } from "../../types/publisher";
import { PublisherRequest } from "../../types/passport";
import { buildPublisherData } from "./transformer";
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
    const user = req.user as PublisherRecord;

    const params = zod
      .object({
        organizationClientId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const [publishers, organizationExclusions] = await Promise.all([
      publisherService.findPublishers({ diffuseurOf: user.id }),
      OrganizationExclusionModel.find({
        excludedByPublisherId: user.id,
      }),
    ]);

    // Build Set of exclusions to lookup clicks with .has() for better performance
    const exclusionSet = new Set(organizationExclusions.map((o) => `${o.organizationClientId}:${o.excludedForPublisherId}`));

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const publisherIds = publishers.map((publisher) => publisher.id);
    const clicksByPublisher = await statEventService.countStatEventClicksByPublisherForOrganizationSince({
      publisherIds,
      organizationClientId: params.data.organizationClientId,
      from: oneMonthAgo,
    });

    // Build response data
    const data = [] as any[];
    publishers.forEach((publisher) => {
      const isExcluded = exclusionSet.has(`${params.data.organizationClientId}:${publisher.id}`);
      const clicks = clicksByPublisher[publisher.id] || 0;

      data.push(buildPublisherData(publisher, clicks, isExcluded));
    });

    return res.status(200).send({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:organizationClientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

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

    const publishers = await publisherService.findPublishers({ diffuseurOf: user.id });

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
      excludedByPublisherId: user.id,
      organizationClientId: params.data.organizationClientId,
    });

    const bulk: any[] = [];
    publishers
      .filter((publisher) => !body.data.publisherIds.includes(publisher.id))
      .forEach((publisher) => {
        bulk.push({
          excludedByPublisherId: user.id,
          excludedByPublisherName: user.name,
          excludedForPublisherId: publisher.id,
          excludedForPublisherName: publisher.name,
          organizationClientId: params.data.organizationClientId,
          organizationName: body.data.organizationName || "",
        });
      });

    await OrganizationExclusionModel.insertMany(bulk);

    const newOrganizationExclusions = await OrganizationExclusionModel.find({
      excludedByPublisherId: user.id,
      organizationClientId: params.data.organizationClientId,
    });

    const data = [] as any[];
    publishers.forEach((publisher) => {
      const isExcluded = newOrganizationExclusions.some((o) => o.excludedForPublisherId === publisher.id);
      data.push({
        _id: publisher.id,
        name: publisher.name,
        category: publisher.category,
        url: publisher.url,
        logo: publisher.logo,
        description: publisher.description,
        widget: publisher.hasWidgetRights,
        api: publisher.hasApiRights,
        campaign: publisher.hasCampaignRights,
        annonceur: publisher.isAnnonceur,
        excluded: isExcluded,
      });
    });

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

export default router;
