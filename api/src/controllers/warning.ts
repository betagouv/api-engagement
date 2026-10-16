import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "@/error";
import { alertsWebhookSecurity } from "@/middlewares/alerts-webhook";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { importService } from "@/services/import";
import { warningService } from "@/services/warning";
import { warningAlertService } from "@/services/warning-alert";
import { UserRequest } from "@/types/passport";

const router = Router();
router.use(ipRateLimiter);

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

const alertSchema = zod.object({
  type: zod.string().min(1),
  publisherId: zod.string().min(1),
  title: zod.string().optional(),
  description: zod.string().optional(),
  procedureUrl: zod.string().url().optional(),
});

// Ingestion des alertes (Metabase → webhook) : une alerte par annonceur, le chargé de déploiement est notifié à la création.
router.post("/webhook", alertsWebhookSecurity, async (req, res, next) => {
  try {
    const body = zod.object({ alerts: zod.array(alertSchema).min(1).max(500) }).safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    let created = 0;
    let updated = 0;
    const unknownPublishers: string[] = [];
    for (const alert of body.data.alerts) {
      const result = await warningAlertService.ingest(alert);
      if (!result) {
        unknownPublishers.push(alert.publisherId);
      } else if (result.created) {
        created++;
      } else {
        updated++;
      }
    }
    return res.status(200).send({ ok: true, data: { created, updated, unknownPublishers } });
  } catch (error) {
    next(error);
  }
});

const canManageWarning = async (user: { id: string; role: string }, warningId: string) => {
  const warning = await warningService.findWarningById(warningId);
  if (!warning) {
    return { warning: null, allowed: false };
  }
  return { warning, allowed: user.role === "admin" || warning.assignees.some((assignee) => assignee.id === user.id) };
};

router.put("/:id/status", passport.authenticate(["user", "admin"], { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string().uuid() }).safeParse(req.params);
    const body = zod.object({ status: zod.enum(["TODO", "IN_PROGRESS", "RESOLVED"]) }).safeParse(req.body);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const { warning, allowed } = await canManageWarning(req.user, params.data.id);
    if (!warning) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    if (!allowed) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }
    const data = await warningService.updateWarning(warning.id, { status: body.data.status });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/assignees", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string().uuid() }).safeParse(req.params);
    const body = zod.object({ userIds: zod.array(zod.string()).max(20) }).safeParse(req.body);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const data = await warningAlertService.assign(params.data.id, body.data.userIds);
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
