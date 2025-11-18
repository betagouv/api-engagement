import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY } from "../../error";
import { UserRequest } from "../../types/passport";
import { normalizeDateRange } from "../../utils";
import {
  getAnnouncePreviewStats,
  getAnnouncePublishers,
  getBroadcastPreviewStats,
  getBroadcastPublishers,
  getDistributionStats,
  getEvolutionStats,
  getMissionsStats,
} from "./helper";

const router = Router();
const router = Router();

router.get(
  "/broadcast-preview",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          publisherId: zod.string().optional(),
          from: zod.string().date().optional(),
          to: zod.string().date().optional(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getBroadcastPreviewStats(normalizeDateRange(query.data));

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/announce-preview", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.string().date().optional(),
        to: zod.string().date().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, error: query.error });
    }

    const data = await getAnnouncePreviewStats(normalizeDateRange(query.data));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/distribution",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          publisherId: zod.string().optional(),
          from: zod.string().date().optional(),
          to: zod.string().date().optional(),
          type: zod.enum(["click", "apply", "print", "account"]).optional(),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getDistributionStats(normalizeDateRange(query.data));

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/evolution", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.string().date(),
        to: zod.string().date(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getEvolutionStats(normalizeDateRange(query.data));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/broadcast-publishers",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          publisherId: zod.string().optional(),
          from: zod.string().date().optional(),
          to: zod.string().date().optional(),
          flux: zod.enum(["to", "from"]).default("to"),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const data = await getBroadcastPublishers(normalizeDateRange(query.data));

      return res.status(200).send({ ok: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/announce-publishers",
  passport.authenticate("user", { session: false }),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const query = zod
        .object({
          publisherId: zod.string().optional(),
          type: zod.enum(["click", "apply", "print", "account"]).optional(),
          from: zod.string().date().optional(),
          to: zod.string().date().optional(),
          flux: zod.enum(["to", "from"]).default("to"),
        })
        .safeParse(req.query);

      if (!query.success) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
      }

      const { data, total } = await getAnnouncePublishers(normalizeDateRange(query.data));

      return res.status(200).send({ ok: true, data, total });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/missions", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.string().date().optional(),
        to: zod.string().date().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { data, total } = await getMissionsStats(normalizeDateRange(query.data));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
