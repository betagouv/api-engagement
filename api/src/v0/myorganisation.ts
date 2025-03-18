import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS } from "../error";
import PublisherModel from "../models/publisher";
import RequestModel from "../models/request";
import { Publisher } from "../types";
import { PublisherRequest } from "../types/passport";
const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
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

    const publishers = await PublisherModel.find({ "publishers.publisherId": user._id.toString() });

    const data = [] as any[];
    publishers.forEach((e) => {
      const publisher = e.publishers.find((p) => p.publisherId === user._id.toString());
      if (!publisher) return null;
      data.push({
        _id: e._id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.role_annonceur_widget,
        api: e.role_annonceur_api,
        campaign: e.role_annonceur_campagne,
        annonceur: e.role_promoteur,
        excluded: publisher.excludedOrganisations.includes(params.data.organizationClientId),
      });
    });
    return res.status(200).send({ ok: true, data: data.filter((e) => e !== null), total: data.filter((e) => e !== null).length });
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
        publisherIds: zod.array(zod.string()).optional(),
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

    const publishers = await PublisherModel.find({ "publishers.publisherId": user._id.toString() });

    if (body.data.publisherIds) {
      for (const publisher of publishers) {
        const myPublisher = publisher.publishers.find((p) => p.publisherId === user._id.toString());
        if (!myPublisher) continue;

        console.log("myPublisher", publisher.name, myPublisher.excludedOrganisations);

        let excludedOrganisations = new Set(myPublisher.excludedOrganisations);
        if (body.data.publisherIds.includes(publisher._id.toString())) excludedOrganisations.delete(params.data.organizationClientId);
        else excludedOrganisations.add(params.data.organizationClientId);

        console.log("excludedOrganisations", Array.from(excludedOrganisations));
        myPublisher.excludedOrganisations = Array.from(excludedOrganisations);
        await publisher.save();
      }
    }

    const data = [] as any[];
    publishers.forEach((e) => {
      const myPublisher = e.publishers.find((p) => p.publisherId === user._id.toString());
      if (!myPublisher) return null;
      data.push({
        _id: e._id,
        name: e.name,
        category: e.category,
        url: e.url,
        logo: e.logo,
        description: e.description,
        widget: e.role_annonceur_widget,
        api: e.role_annonceur_api,
        campaign: e.role_annonceur_campagne,
        annonceur: e.role_promoteur,
        excluded: myPublisher.excludedOrganisations.includes(params.data.organizationClientId),
      });
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
