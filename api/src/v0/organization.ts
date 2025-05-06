import { NextFunction, Response, Router } from "express";
import zod from "zod";

import passport from "passport";
import { INVALID_QUERY } from "../error";
import OrganizationModel from "../models/organization";
import RequestModel from "../models/request";
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
      route: `/v0/association${req.route.path}`,
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

router.get(
  "/",
  passport.authenticate(["apikey", "api"], { session: false }),
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          q: zod.string().optional(),
          rna: zod.string().optional(),
          siret: zod.string().optional(),
          limit: zod.coerce.number().min(0).max(100).default(25),
          skip: zod.coerce.number().min(0).default(0),
        })
        .passthrough()
        .safeParse(req.query);

      if (!query.success) {
        res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
        return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
      }

      const where = {} as { [key: string]: any };

      if (query.data.q) {
        where.$text = { $search: query.data.q };
      }
      if (query.data.rna) {
        where.rna = query.data.rna;
      }
      if (query.data.siret) {
        where.siret = query.data.siret;
      }

      const data = await OrganizationModel.find(where)
        .skip(query.data.skip)
        .limit(query.data.limit);
      const total = await OrganizationModel.countDocuments(where);

      return res.status(200).send({ ok: true, data: data, total });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
