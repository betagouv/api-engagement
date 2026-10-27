import { Router } from "express";

import { INVALID_BODY } from "@/error";
import { alertsWebhookSecurity } from "@/middlewares/alerts-webhook";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { processInboundEmails } from "@/services/inbound-email";
import { inboundEmailSchema } from "@/services/inbound-email/types";
import { appendAuditEvent } from "@/utils/audit-log";

const router = Router();
router.use(ipRateLimiter);

// Point d'entrée unique du webhook Brevo "inbound parsing" : chaque mail est routé selon le préfixe de l'adresse destinataire.
router.post("/", alertsWebhookSecurity, async (req, res, next) => {
  try {
    const body = inboundEmailSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }
    const { processed, audits } = await processInboundEmails(body.data.items);
    audits.forEach((event) => appendAuditEvent(req, event));
    return res.status(200).send({ ok: true, data: { processed } });
  } catch (error) {
    next(error);
  }
});

export default router;
