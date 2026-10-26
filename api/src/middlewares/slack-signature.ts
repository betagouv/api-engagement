import { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "http";

import { SLACK_SIGNING_SECRET } from "@/config";
import { ACCESS_DENIED } from "@/error";
import { verifySlackSignature } from "@/services/slack/signature";
import { appendAuditEvent } from "@/utils/audit-log";

type RequestWithRawBody = Request & { rawBody?: Buffer };

// `verify` de body-parser : Slack signe le corps brut, que le parsing urlencoded fait perdre. On ne le garde que pour /slack/.
export const captureSlackRawBody = (req: IncomingMessage, _res: unknown, buf: Buffer) => {
  if ((req as Request).originalUrl?.startsWith("/slack/")) {
    (req as RequestWithRawBody).rawBody = buf;
  }
};

export const slackSignatureSecurity = (req: RequestWithRawBody, res: Response, next: NextFunction) => {
  const valid = verifySlackSignature({
    secret: SLACK_SIGNING_SECRET,
    timestamp: req.header("x-slack-request-timestamp"),
    signature: req.header("x-slack-signature"),
    rawBody: req.rawBody,
  });
  if (!valid) {
    appendAuditEvent(req, { action: "webhook.slack.invalid_signature", outcome: "denied" });
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }
  next();
};
