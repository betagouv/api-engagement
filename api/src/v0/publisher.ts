import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_PARAMS, NOT_FOUND } from "../error";
import PublisherModel from "../models/publisher";
import RequestModel from "../models/request";
import { PublisherRequest } from "../types/passport";
const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
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
    const partners = await PublisherModel.find({ "publishers.publisherId": req.user._id.toString() });

    const data = partners.map((e) => {
      const publisher = e.publishers.find((p) => p.publisherId === req.user._id.toString());
      if (!publisher) return null;
      return {
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
        excludedOrganisations: publisher.excludedOrganisations,
      };
    });

    res.locals = { total: data.filter((e) => e !== null).length };
    return res.status(200).send({ ok: true, data: data.filter((e) => e !== null), total: data.filter((e) => e !== null).length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const publisher = await PublisherModel.findOne({ _id: params.data.id, "publishers.publisherId": req.user._id.toString() });
    if (!publisher) {
      res.locals = { code: NOT_FOUND, message: "Publisher not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const data = {
      _id: publisher._id,
      name: publisher.name,
      category: publisher.category,
      url: publisher.url,
      logo: publisher.logo,
      description: publisher.description,
      widget: publisher.role_annonceur_widget,
      api: publisher.role_annonceur_api,
      campaign: publisher.role_annonceur_campagne,
      annonceur: publisher.role_promoteur,
      excludedOrganisations: publisher.publishers.find((p) => p.publisherId === req.user._id.toString())?.excludedOrganisations || [],
    };

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
