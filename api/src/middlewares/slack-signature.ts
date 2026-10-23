import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "http";

import { SLACK_SIGNING_SECRET } from "@/config";
import { ACCESS_DENIED } from "@/error";
import { appendAuditEvent } from "@/utils/audit-log";

const MAX_AGE_SECONDS = 300;

// `verify` de body-parser : Slack signe le corps brut, que le parsing urlencoded fait perdre. On ne le garde que pour /slack/.
export const captureSlackRawBody = (req: IncomingMessage, _res: unknown, buf: Buffer) => {
  if ((req as Request).originalUrl?.startsWith("/slack/")) {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  }
};

const isSignatureValid = (req: Request & { rawBody?: Buffer }) => {
  const timestamp = req.header("x-slack-request-timestamp");
  const signature = req.header("x-slack-signature");
  if (!SLACK_SIGNING_SECRET || !timestamp || !signature || !req.rawBody) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) {
    return false;
  }
  const expected = Buffer.from(`v0=${createHmac("sha256", SLACK_SIGNING_SECRET).update(`v0:${timestamp}:`).update(req.rawBody).digest("hex")}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const slackSignatureSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!isSignatureValid(req)) {
    appendAuditEvent(req, { action: "webhook.slack.invalid_signature", outcome: "denied" });
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }
  next();
};
