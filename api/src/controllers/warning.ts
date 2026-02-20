import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_QUERY } from "@/error";
import { importService } from "@/services/import";
import { warningService } from "@/services/warning";
import { UserRequest } from "@/types/passport";

const router = Router();

router.post("/search", passport.authenticate(["user", "admin"], { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
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

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    let createdAtGte: Date | undefined;
    let createdAtLt: Date | undefined;

    if (body.data.month !== undefined && body.data.year !== undefined) {
      createdAtGte = new Date(body.data.year, body.data.month, 1, 0, 0, 0);
      createdAtLt = new Date(body.data.year, body.data.month + 1, 1, 0, 0, 0);
    } else if (body.data.year !== undefined) {
      createdAtGte = new Date(body.data.year, 0, 1, 0, 0, 0);
      createdAtLt = new Date(body.data.year + 1, 0, 1, 0, 0, 0);
    } else if (body.data.month !== undefined) {
      createdAtGte = new Date(new Date().getFullYear(), body.data.month, 1, 0, 0, 0);
      createdAtLt = new Date(new Date().getFullYear(), body.data.month + 1, 1, 0, 0, 0);
    }

    if (req.user.role !== "admin" && (!body.data.publisherId || !req.user.publishers.includes(body.data.publisherId))) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const data = await warningService.findWarnings({
      fixed: body.data.fixed,
      publisherId: body.data.publisherId,
      type: body.data.type,
      createdAtGte,
      createdAtLt,
    });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/state", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const imports = await importService.findImports({ publisherId: query.data.publisherId, size: 100 });
    let success = 0;
    let last = null as Date | null;
    imports.forEach((doc) => {
      if (doc.status === "SUCCESS") {
        success++;
      }
      if (!last || (doc.startedAt && doc.startedAt > last)) {
        last = doc.startedAt ? new Date(doc.startedAt) : last;
      }
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
    const state = await importService.getLastImportSummary();
    return res.status(200).send({ ok: true, data: state });
  } catch (error) {
    next(error);
  }
});

export default router;
