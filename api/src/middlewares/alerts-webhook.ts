import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";

import { ALERTS_WEBHOOK_TOKEN } from "@/config";
import { ACCESS_DENIED } from "@/error";
import { appendAuditEvent } from "@/utils/audit-log";

const isTokenValid = (authorizationHeader?: string) => {
  const [scheme, token] = authorizationHeader?.split(" ") ?? [];
  if (!ALERTS_WEBHOOK_TOKEN || scheme !== "Bearer" || !token) {
    return false;
  }
  const expected = Buffer.from(ALERTS_WEBHOOK_TOKEN);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const alertsWebhookSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!isTokenValid(req.header("authorization"))) {
    appendAuditEvent(req, { action: "webhook.alerts.invalid_token", outcome: "denied" });
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }
  next();
};
