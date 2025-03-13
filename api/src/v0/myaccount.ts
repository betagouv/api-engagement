import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import PublisherModel from "../models/publisher";
import RequestModel from "../models/request";
import UserModel from "../models/user";
import { Publisher, User } from "../types";
import { PublisherRequest } from "../types/passport";
const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v0/myaccount${req.route.path}`,
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
    const partners = await PublisherModel.find({ _id: { $in: req.user.publishers.map((e: { publisher: string }) => e.publisher) } });
    const users = await UserModel.find({ _id: { $in: req.user.send_report_to } });

    return res.status(200).send({ ok: true, data: buildData(req.user as Publisher, partners, users) });
  } catch (error) {
    next(error);
  }
});

router.put("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        excludedOrganisations: zod.array(zod.string()).optional(),
      })
      .parse(req.body);

    if (body.excludedOrganisations) req.user.excludedOrganisations = body.excludedOrganisations;

    await req.user.save();

    return res.status(200).send({ ok: true, data: buildData(req.user as Publisher) });
  } catch (error) {
    next(error);
  }
});

const buildData = (data: Publisher, partners?: Publisher[], users?: User[]) => {
  return {
    _id: data._id,
    name: data.name,
    category: data.category,
    url: data.url,
    logo: data.logo,
    description: data.description,
    widget: data.role_annonceur_widget,
    api: data.role_annonceur_api,
    campaign: data.role_annonceur_campagne,
    annonceur: data.role_promoteur,
    automatedReport: data.automated_report,
    sendReportTo:
      users?.map((e: User) => ({
        _id: e._id,
        email: e.email,
      })) || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    excludedOrganisations: data.excludedOrganisations,
    partners:
      partners?.map((e: Publisher) => ({
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
      })) || undefined,
  };
};

export default router;
