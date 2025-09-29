import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "../../error";
import RequestModel from "../../models/request";
import { PublisherRequest } from "../../types/passport";
import { searchAssociations } from "./helper";

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

router.post(
  "/snu",
  passport.authenticate("api", { session: false }),
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
    try {
      const body = zod
        .object({
          filters: zod
            .object({
              searchbar: zod.array(zod.string()).nullable().optional(),
              coordonnees_adresse_region: zod.array(zod.string()).nullable().optional(),
              coordonnees_adresse_departement: zod.array(zod.string()).nullable().optional(),
              activites_lib_theme1: zod.array(zod.string()).nullable().optional(),
            })
            .optional(),
          sort: zod
            .object({
              field: zod.string(),
              order: zod.enum(["asc", "desc"]),
            })
            .nullable()
            .optional(),
          size: zod.coerce.number().max(100).default(10),
          page: zod.coerce.number().default(0),
        })
        .safeParse(req.body);

      if (!body.success) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
      }

      const result = await searchAssociations(body.data);

      if (result.hitsStatus !== 200) {
        res.locals = {
          code: result.hitsStatus,
          message: result.hitsErrorType,
        };
      } else {
        res.locals = { total: result.total };
      }

      return res.status(200).send(result.body);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
