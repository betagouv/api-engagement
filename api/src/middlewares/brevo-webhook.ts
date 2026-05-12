import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";

import { BREVO_WEBHOOK_TOKEN } from "@/config";
import { ACCESS_DENIED } from "@/error";
import { appendAuditEvent } from "@/utils/audit-log";

const isTokenValid = (authorizationHeader?: string) => {
  if (!BREVO_WEBHOOK_TOKEN) {
    return false;
  }

  const parts = authorizationHeader?.split(" ") ?? [];
  if (parts.length !== 2) {
    return false;
  }

  const [scheme, token] = parts;
  if (scheme !== "Bearer" || !token) {
    return false;
  }

  const expected = Buffer.from(BREVO_WEBHOOK_TOKEN);
  const received = Buffer.from(token);
  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
};

export const brevoWebhookSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!isTokenValid(req.header("authorization"))) {
    appendAuditEvent(req, {
      action: "webhook.brevo.invalid_token",
      outcome: "denied",
    });
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }

  next();
};
