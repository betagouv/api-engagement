import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";

import { BREVO_WEBHOOK_IP_ALLOWLIST, BREVO_WEBHOOK_TOKEN } from "@/config";
import { ACCESS_DENIED, FORBIDDEN } from "@/error";
import { appendAuditEvent } from "@/utils/audit-log";

const normalizeIpv4 = (ip?: string) => {
  if (!ip) {
    return null;
  }

  if (ip.startsWith("::ffff:")) {
    return ip.slice("::ffff:".length);
  }

  return ip;
};

const ipv4ToNumber = (ip: string) => {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const parsed = Number(part);
    if (parsed < 0 || parsed > 255) {
      return null;
    }
    value = (value << 8) + parsed;
  }

  return value >>> 0;
};

export const isIpInCidr = (ip: string, cidr: string) => {
  const normalizedIp = normalizeIpv4(ip);
  if (!normalizedIp) {
    return false;
  }

  const [rangeIp, prefixLengthRaw] = cidr.trim().split("/");
  const prefixLength = Number(prefixLengthRaw);
  if (!rangeIp || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  const ipNumber = ipv4ToNumber(normalizedIp);
  const rangeNumber = ipv4ToNumber(rangeIp);
  if (ipNumber === null || rangeNumber === null) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipNumber & mask) === (rangeNumber & mask);
};

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

const isIpAllowed = (ip?: string) => {
  const normalizedIp = normalizeIpv4(ip);
  if (!normalizedIp) {
    return false;
  }

  return BREVO_WEBHOOK_IP_ALLOWLIST.split(",").some((cidr) => isIpInCidr(normalizedIp, cidr));
};

export const brevoWebhookSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!isTokenValid(req.header("authorization"))) {
    appendAuditEvent(req, {
      action: "webhook.brevo.invalid_token",
      outcome: "denied",
    });
    return res.status(401).send({ ok: false, code: ACCESS_DENIED, message: "Not allowed" });
  }

  if (!isIpAllowed(req.ip)) {
    appendAuditEvent(req, {
      action: "webhook.brevo.ip_not_allowed",
      outcome: "denied",
      metadata: {
        ip: req.ip,
      },
    });
    return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
  }

  next();
};
