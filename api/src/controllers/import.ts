import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS } from "../error";
import ImportModel from "../models/import";
import { UserRequest } from "../types/passport";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        publisherId: zod.string().optional(),
        skip: zod.number().min(0).max(10000).default(0),
        size: zod.number().min(1).max(100).default(25),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error.errors });
    }

    if (req.user.role !== "admin" && (!body.data.publisherId || !req.user.publishers.includes(body.data.publisherId))) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const where = {} as { [key: string]: any };
    if (body.data.publisherId) {
      where.publisherId = body.data.publisherId;
    }

    const total = await ImportModel.countDocuments(where);
    const data = await ImportModel.find(where).sort({ startedAt: -1 }).limit(body.data.size).skip(body.data.skip);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: queryError, value: query } = Joi.object({
      publisherId: Joi.string().allow("").optional(),
      skip: Joi.number().min(0).max(10000).default(0),
      size: Joi.number().min(1).max(100).default(25),
    })
      .unknown()
      .validate(req.query);

    if (queryError) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: queryError.details });
    }

    if (req.user.role !== "admin" && !query.publisherId) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const where = {} as { [key: string]: any };
    if (query.publisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(query.publisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      } else {
        where.publisherId = query.publisherId;
      }
    } else if (req.user.role !== "admin") {
      where.publisherId = { $in: req.user.publishers };
    }

    const total = await ImportModel.countDocuments(where);
    const data = await ImportModel.find(where).sort({ startedAt: -1 }).limit(query.size).skip(query.skip);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/last", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const imports = await ImportModel.aggregate([{ $group: { _id: "$publisherId", doc: { $last: "$$ROOT" } } }]);
    const data = imports.map((i) => ({
      _id: i.doc._id,
      publisherId: i.doc.publisherId,
      publisherName: i.doc.name,
      startedAt: i.doc.startedAt,
      endedAt: i.doc.endedAt,
      status: i.doc.status,
      createdCount: i.doc.createdCount,
      deletedCount: i.doc.deletedCount,
      updatedCount: i.doc.updatedCount,
      missionCount: i.doc.missionCount,
      refusedCount: i.doc.refusedCount,
    }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
