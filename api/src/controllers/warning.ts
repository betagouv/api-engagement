import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { alertsWebhookSecurity } from "@/middlewares/alerts-webhook";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { getAlertProvider } from "@/services/alerts";
import { ingestAlerts, isUniqueViolation } from "@/services/alerts/ingest";
import { importService } from "@/services/import";
import { warningService } from "@/services/warning";
import { warningCommentService } from "@/services/warning-comment";
import { UserRequest } from "@/types/passport";
import { appendAuditEvent } from "@/utils/audit-log";

const router = Router();
router.use(ipRateLimiter);

router.post("/search", passport.authenticate(["user", "admin"], { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        fixed: zod.coerce.boolean().default(false),
        publisherId: zod.string().optional(),
        type: zod.string().optional(),
        status: zod.enum(["TODO", "IN_PROGRESS", "RESOLVED"]).optional(),
        month: zod.number().optional(),
        year: zod.number().optional(),
        page: zod.number().int().min(1).optional(),
        size: zod.number().int().min(1).max(100).default(20),
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

    // `status` remplace `fixed` quand il est fourni ; sans `page`, la réponse reste la liste complète (appelants historiques).
    const params = {
      fixed: body.data.status ? undefined : body.data.fixed,
      status: body.data.status,
      publisherId: body.data.publisherId,
      type: body.data.type,
      createdAtGte,
      createdAtLt,
    };
    if (body.data.page === undefined) {
      return res.status(200).send({ ok: true, data: await warningService.findWarnings(params) });
    }
    const [data, total] = await Promise.all([
      warningService.findWarnings({ ...params, limit: body.data.size, skip: (body.data.page - 1) * body.data.size }),
      warningService.countWarnings(params),
    ]);
    return res.status(200).send({ ok: true, data, total });
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

router.get("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    const data = await warningService.findWarningById(params.data.id);
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/status", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    const body = zod.object({ status: zod.enum(["TODO", "IN_PROGRESS", "RESOLVED"]) }).safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }
    if (!(await warningService.findWarningById(params.data.id))) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    try {
      const data = await warningService.updateWarning(params.data.id, { status: body.data.status });
      return res.status(200).send({ ok: true, data });
    } catch (error) {
      // Index unique partiel : une seule alerte ouverte par annonceur et type.
      if (isUniqueViolation(error)) {
        return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: "Une alerte ouverte existe déjà pour cet annonceur et ce type" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:id/comments", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!(await warningService.findWarningById(params.data.id))) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    return res.status(200).send({ ok: true, data: await warningCommentService.findComments(params.data.id) });
  } catch (error) {
    next(error);
  }
});

const commentBody = zod.object({ body: zod.string().trim().min(1).max(5000) });

router.post("/:id/comments", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    const body = commentBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }
    if (!(await warningService.findWarningById(params.data.id))) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    const data = await warningCommentService.createComment({ warningId: params.data.id, authorId: req.user.id, body: body.data.body });
    appendAuditEvent(req, { action: "alert.comment.create", outcome: "success", target: { type: "warning", id: params.data.id }, metadata: { commentId: data.id } });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

// Un commentaire n'est modifiable que par son auteur.
router.put("/:id/comments/:commentId", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string(), commentId: zod.string() }).safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    const body = commentBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }
    const comment = await warningCommentService.findComment(params.data.commentId);
    if (!comment || comment.warningId !== params.data.id) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    if (comment.authorId !== req.user.id) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }
    const data = await warningCommentService.updateComment(comment.id, body.data.body);
    appendAuditEvent(req, { action: "alert.comment.update", outcome: "success", target: { type: "warning", id: params.data.id }, metadata: { commentId: comment.id } });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

// Ingestion des alertes d'une source (`metabase`) : le chargé de déploiement de l'annonceur est notifié à la création.
router.post("/webhook/:source", alertsWebhookSecurity, async (req, res, next) => {
  try {
    const provider = getAlertProvider(String(req.params.source));
    if (!provider) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Unknown alert source" });
    }
    const body = provider.parse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }
    const summary = await ingestAlerts(body.data.alerts);
    return res.status(200).send({ ok: true, data: { ...summary, received: body.data.received } });
  } catch (error) {
    next(error);
  }
});

export default router;
