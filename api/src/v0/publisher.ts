import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_PARAMS, NOT_FOUND } from "../error";
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
    const user = req.user as Publisher;
    const partners = await PublisherModel.find({ "publishers.publisherId": user._id.toString() });
    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedByPublisherId: user._id.toString(),
    });

    const data = partners.map((e) => {
      return {
        _id: e._id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.widget,
        api: e.api,
        campaign: e.campaign,
        annonceur: e.isAnnonceur,
        excludedOrganizations: organizationExclusions.filter((o) => o.excludedForPublisherId === e._id.toString()),
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
    const user = req.user as Publisher;
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const publisher = await PublisherModel.findOne({
      _id: params.data.id,
      "publishers.publisherId": user._id.toString(),
    });
    if (!publisher) {
      res.locals = { code: NOT_FOUND, message: "Publisher not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedForPublisherId: publisher._id.toString(),
      excludedByPublisherId: user._id.toString(),
    });

    const data = {
      _id: publisher._id,
      name: publisher.name,
      category: publisher.category,
      url: publisher.url,
      logo: publisher.logo,
      description: publisher.description,
      widget: publisher.widget,
      api: publisher.api,
      campaign: publisher.campaign,
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
