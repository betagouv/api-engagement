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

router.get("/broadcast-preview", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getBroadcastPreviewStats({
      publisherId: query.data.publisherId,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/announce-preview", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, error: query.error });
    }

    const data = await getAnnouncePreviewStats({
      publisherId: query.data.publisherId,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/distribution", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getDistributionStats({
      publisherId: query.data.publisherId,
      type: query.data.type,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/evolution", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date(),
        to: zod.date(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { to, from } = normalizeDateRange(query.data.from, query.data.to);

    const data = await getEvolutionStats({
      publisherId: query.data.publisherId,
      type: query.data.type,
      flux: query.data.flux,
      to: to || new Date(),
      from: from || new Date(),
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/broadcast-publishers", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getBroadcastPublishers({
      publisherId: query.data.publisherId,
      flux: query.data.flux,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/announce-publishers", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { data, total } = await getAnnouncePublishers({
      publisherId: query.data.publisherId,
      type: query.data.type,
      flux: query.data.flux,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/missions", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.date().optional(),
        to: zod.date().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { data, total } = await getMissionsStats({
      publisherId: query.data.publisherId,
      ...normalizeDateRange(query.data.from, query.data.to),
    });

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
