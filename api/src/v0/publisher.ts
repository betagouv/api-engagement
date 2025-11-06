import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_PARAMS, NOT_FOUND } from "../error";
import OrganizationExclusionModel from "../models/organization-exclusion";
import RequestModel from "../models/request";
import { publisherService } from "../services/publisher";
import { PublisherRequest } from "../types/passport";
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
      route: `/v0/publisher${req.route.path}`,
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

router.get("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const partners = await publisherService.findPublishers({ diffuseurOf: user.id });
    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedByPublisherId: user.id,
    });

    const data = partners.map((e) => {
      return {
        _id: e.id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.hasWidgetRights,
        api: e.hasApiRights,
        campaign: e.hasCampaignRights,
        annonceur: e.isAnnonceur,
        excludedOrganizations: organizationExclusions.filter((o) => o.excludedForPublisherId === e.id),
      };
    });

    res.locals = { total: data.filter((e) => e !== null).length };
    return res.status(200).send({
      ok: true,
      data: data.filter((e) => e !== null),
      total: data.filter((e) => e !== null).length,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const publisher = await publisherService.findOnePublisherById(params.data.id);
    if (!publisher || !publisher.publishers.some((p) => p.diffuseurPublisherId === user.id)) {
      res.locals = { code: NOT_FOUND, message: "Publisher not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedForPublisherId: publisher.id,
      excludedByPublisherId: user.id,
    });

    const data = {
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
      excludedOrganizations: organizationExclusions,
    };

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
