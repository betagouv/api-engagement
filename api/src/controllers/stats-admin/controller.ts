import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY } from "../../error";
import { UserRequest } from "../../types/passport";
import {
  getActiveMissionsStats,
  getCreatedMissionsStats,
  getPublisherViewsStats,
  getViewsStats,
} from "./helper";

const router = Router();

router.get(
  "/views",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          type: zod.enum(["volontariat", "benevolat"]).optional(),
          from: zod.coerce.date().optional(),
          to: zod.coerce.date().optional(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getViewsStats(query.data);

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/created-missions",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          type: zod.enum(["volontariat", "benevolat"]).optional(),
          from: zod.coerce.date().optional(),
          to: zod.coerce.date().optional(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getCreatedMissionsStats(query.data);

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/active-missions",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          type: zod.enum(["volontariat", "benevolat"]).optional(),
          from: zod.coerce.date(),
          to: zod.coerce.date(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getActiveMissionsStats(query.data);

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/publishers-views",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          from: zod.coerce.date().optional(),
          to: zod.coerce.date().optional(),
          broadcaster: zod.string().optional(),
          announcer: zod.string().optional(),
          type: zod.enum(["volontariat", "benevolat", ""]).optional(),
          source: zod.enum(["widget", "campaign", "publisher", ""]).optional(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const { data, total } = await getPublisherViewsStats(query.data);

      return res.status(200).send({ ok: true, data, total });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

