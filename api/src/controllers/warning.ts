import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";
import zod from "zod";

import { ImportModel, WarningModel } from "@shared/models";

import { INVALID_BODY, INVALID_PARAMS, INVALID_QUERY } from "../error";
import { UserRequest } from "../types/passport";

const router = Router();

router.post("/search", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        fixed: zod.coerce.boolean().default(false),
        publisherId: zod.string().optional(),
        type: zod.string().optional(),
        month: zod.number().optional(),
        year: zod.number().optional(),
      })
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });

    const where = { fixed: body.data.fixed } as { [key: string]: any };
    if (body.data.publisherId) where.publisherId = body.data.publisherId;
    if (body.data.type) where.type = body.data.type;
    if (body.data.month !== undefined && body.data.year !== undefined) {
      const startMonth = new Date(body.data.year, body.data.month, 1, 0, 0, 0);
      const endMonth = new Date(body.data.year, body.data.month + 1, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    } else if (body.data.year !== undefined) {
      const startYear = new Date(body.data.year, 0, 1, 0, 0, 0);
      const endYear = new Date(body.data.year + 1, 0, 1, 0, 0, 0);
      where.createdAt = { $gte: startYear, $lt: endYear };
    } else if (body.data.month !== undefined) {
      const startMonth = new Date(new Date().getFullYear(), body.data.month, 1, 0, 0, 0);
      const endMonth = new Date(new Date().getFullYear(), body.data.month + 1, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    }

    const data = await WarningModel.find(where).sort({ createdAt: -1 }).lean();
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: queryError, value: query } = Joi.object({
      fixed: Joi.boolean().default(false),
      publisherId: Joi.string().allow("").optional(),
      type: Joi.string(),
      month: Joi.number().min(1).max(12).allow("").optional(),
      year: Joi.number().min(2000).max(3000).allow("").optional(),
    }).validate(req.query);

    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: queryError.details });

    const where = { fixed: query.fixed } as { [key: string]: any };
    if (query.publisherId) where.publisherId = query.publisherId;
    if (query.type) where.type = query.type;
    if (query.month && query.year) {
      const startMonth = new Date(query.year, query.month - 1, 1, 0, 0, 0);
      const endMonth = new Date(query.year, query.month, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    } else if (query.year) {
      const year = parseInt(query.year);
      const startYear = new Date(year, 0, 1, 0, 0, 0);
      const endYear = new Date(year + 1, 0, 1, 0, 0, 0);
      where.createdAt = { $gte: startYear, $lt: endYear };
    } else if (query.month) {
      const startMonth = new Date(new Date().getFullYear(), query.month - 1, 1, 0, 0, 0);
      const endMonth = new Date(new Date().getFullYear(), query.month, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    }

    const data = await WarningModel.find(where).sort({ createdAt: -1 }).lean();
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/state", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const imports = await ImportModel.aggregate([{ $group: { _id: "$publisherId", doc: { $last: "$$ROOT" } } }]);
    let success = 0;
    let last = null as Date | null;
    imports.forEach(({ doc }) => {
      if (doc.status === "success") success++;
      if (!last || new Date(doc.startedAt) > last) last = new Date(doc.startedAt);
    });

    const data = {
      up: success / imports.length < 0.9 ? false : true,
      upToDate: !last || last < new Date(Date.now() - 1000 * 60 * 60 * 24) ? false : true,
      last,
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/admin-state", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const imports = await ImportModel.aggregate([{ $group: { _id: "$publisherId", doc: { $last: "$$ROOT" } } }]);
    let success = 0;
    let last = null as Date | null;
    imports.forEach(({ doc }) => {
      if (doc.status === "SUCCESS") success++;
      if (!last || new Date(doc.startedAt) > last) last = new Date(doc.startedAt);
    });

    return res.status(200).send({ ok: true, data: { success, imports: imports.length, last } });
  } catch (error) {
    next(error);
  }
});

router.get("/:publisherId", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: queryError, value: query } = Joi.object({
      fixed: Joi.boolean().default(false),
      type: Joi.string(),
      month: Joi.number().min(1).max(12).allow("").optional(),
      year: Joi.number().min(2000).max(3000).allow("").optional(),
    }).validate(req.query);

    const { error: paramsError, value: params } = Joi.object({
      publisherId: Joi.string().required(),
    }).validate(req.params);

    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: queryError.details });
    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });

    const where = { publisherId: params.publisherId, fixed: query.fixed } as { [key: string]: any };
    if (query.type) where.type = query.type;
    if (query.month && query.year) {
      const startMonth = new Date(query.year, query.month - 1, 1, 0, 0, 0);
      const endMonth = new Date(query.year, query.month, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    } else if (query.year) {
      const year = parseInt(query.year);
      const startYear = new Date(year, 0, 1, 0, 0, 0);
      const endYear = new Date(year + 1, 0, 1, 0, 0, 0);
      where.createdAt = { $gte: startYear, $lt: endYear };
    } else if (query.month) {
      const startMonth = new Date(new Date().getFullYear(), query.month - 1, 1, 0, 0, 0);
      const endMonth = new Date(new Date().getFullYear(), query.month, 1, 0, 0, 0);
      where.createdAt = { $gte: startMonth, $lt: endMonth };
    }

    const data = await WarningModel.find(where)
      .sort({ createdAt: -1 })
      .limit(where.fixed ? 5 : 30)
      .lean();
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
