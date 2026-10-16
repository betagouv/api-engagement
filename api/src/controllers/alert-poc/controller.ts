import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";

import { ALERTS_BREVO_TEMPLATE_ID, ALERTS_WEBHOOK_TOKEN } from "@/config";
import { ACCESS_DENIED, INVALID_BODY, NOT_FOUND } from "@/error";
import { sendTemplate } from "@/services/brevo/email";
import { publisherService } from "@/services/publisher";
import { userService } from "@/services/user";

// POC Keep : endpoints appelés par les workflows Keep (notification du chargé de déploiement, write-back du statut).
const router = Router();

const isTokenValid = (header?: string) => {
  const [scheme, token] = header?.split(" ") ?? [];
  if (!ALERTS_WEBHOOK_TOKEN || scheme !== "Bearer" || !token) {
    return false;
  }
  const expected = Buffer.from(ALERTS_WEBHOOK_TOKEN);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

router.use((req: Request, res: Response, next: NextFunction) => {
  if (!isTokenValid(req.header("authorization"))) {
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }
  next();
});

const notifySchema = z.object({
  publisherId: z.string().min(1),
  description: z.string().default(""),
  triggeredAt: z.string().optional(),
  procedureUrl: z.string().url().optional(),
});

// Retrouve le chargé de déploiement et lui envoie le mail : l'email ne sort jamais de l'API.
router.post("/notify", async (req, res, next) => {
  try {
    const body = notifySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Invalid body" });
    }
    if (!ALERTS_BREVO_TEMPLATE_ID) {
      return res.status(503).send({ ok: false, code: "NOT_CONFIGURED", message: "ALERTS_BREVO_TEMPLATE_ID is not set" });
    }

    const publisher = await publisherService.findOnePublisherById(body.data.publisherId);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }
    const user = publisher.deploymentUserId ? await userService.findUserById(publisher.deploymentUserId) : null;
    if (!user) {
      return res.status(200).send({ ok: true, sent: false, reason: "no_deployment_user" });
    }

    const { ok } = await sendTemplate(ALERTS_BREVO_TEMPLATE_ID, {
      emailTo: [user.email],
      params: {
        firstname: user.firstname,
        publisherName: publisher.name,
        description: body.data.description,
        triggeredAt: body.data.triggeredAt,
        procedureUrl: body.data.procedureUrl,
      },
    });
    return res.status(ok ? 200 : 502).send({ ok, sent: ok });
  } catch (error) {
    next(error);
  }
});

const statusSchema = z.object({
  fingerprint: z.string().min(1),
  status: z.enum(["firing", "acknowledged", "resolved"]),
  publisherId: z.string().optional(),
});

router.post("/status", async (req, res, next) => {
  try {
    const body = statusSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Invalid body" });
    }
    // ponytail: POC, on se contente de tracer. Persistance (table Alert / export analytics) à décider selon le résultat du POC.
    console.log("[alert-poc] status change", body.data);
    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
