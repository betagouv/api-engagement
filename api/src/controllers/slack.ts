import { Router } from "express";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { slackSignatureSecurity } from "@/middlewares/slack-signature";
import { STATUS_ACTION_PREFIX } from "@/services/alerts/notifiers/slack-message";
import { refreshSlackMessage } from "@/services/alerts/slack-sync";
import { respondEphemeral } from "@/services/slack";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { appendAuditEvent } from "@/utils/audit-log";
import { isUniqueViolation } from "@/utils/prisma";

const router = Router();
router.use(ipRateLimiter);

// Slack envoie les interactions en form-urlencoded, avec un champ `payload` qui contient du JSON.
const payloadSchema = zod.object({
  type: zod.string(),
  user: zod.object({ id: zod.string() }),
  response_url: zod.string().url(),
  actions: zod.array(zod.object({ action_id: zod.string(), value: zod.string().optional() })).default([]),
});
const statusSchema = zod.enum(["TODO", "IN_PROGRESS", "RESOLVED"]);

// Boutons « En cours » / « Résolu » du message d'alerte. Réservé aux assignés et aux admins dont le compte est lié à un ID Slack.
router.post("/interactions", slackSignatureSecurity, async (req, res, next) => {
  try {
    let json: unknown;
    try {
      json = JSON.parse(String(req.body?.payload));
    } catch {
      return res.status(400).send({ ok: false, code: INVALID_BODY });
    }
    const payload = payloadSchema.safeParse(json);
    if (!payload.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: payload.error });
    }
    const action = payload.data.type === "block_actions" ? payload.data.actions.find((a) => a.action_id.startsWith(STATUS_ACTION_PREFIX)) : undefined;
    const status = statusSchema.safeParse(action?.action_id.slice(STATUS_ACTION_PREFIX.length));
    if (!action?.value || !status.success) {
      return res.status(200).send();
    }

    const { response_url: responseUrl } = payload.data;
    const target = { type: "warning", id: action.value };
    const user = await userService.findUserBySlackUserId(payload.data.user.id);
    const warning = await warningService.findWarningById(action.value);
    if (!warning) {
      await respondEphemeral(responseUrl, "Cette alerte n'existe plus.");
      return res.status(200).send();
    }
    if (!user) {
      appendAuditEvent(req, { action: "alert.status.slack", outcome: "denied", target, metadata: { reason: "unlinked_account" } });
      await respondEphemeral(responseUrl, "Votre compte Slack n'est pas lié à un compte API Engagement : demandez à un admin de renseigner votre ID Slack.");
      return res.status(200).send();
    }
    if (user.role !== "admin" && !warning.assignees.some((a) => a.id === user.id)) {
      appendAuditEvent(req, { action: "alert.status.slack", outcome: "denied", target, metadata: { reason: "not_assignee", userId: user.id } });
      await respondEphemeral(responseUrl, "Seuls les assignés de l'alerte peuvent changer son statut.");
      return res.status(200).send();
    }

    try {
      if (warning.status !== status.data) {
        await warningService.updateWarning(warning.id, { status: status.data });
      }
    } catch (error) {
      // Index unique partiel : une seule alerte ouverte par annonceur et type.
      if (isUniqueViolation(error)) {
        await respondEphemeral(responseUrl, "Une alerte ouverte existe déjà pour cet annonceur et ce type.");
        return res.status(200).send();
      }
      throw error;
    }
    appendAuditEvent(req, { action: "alert.status.slack", outcome: "success", target, metadata: { userId: user.id, status: status.data } });
    await refreshSlackMessage(warning.id, user.firstname);
    return res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;
