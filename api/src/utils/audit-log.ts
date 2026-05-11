import { Request, Response } from "express";

import { REQUEST_ID_HEADER } from "@/utils/request-id";

export type AuditAction =
  | "access.denied"
  | "user.login_as"
  | "publisher.api_key.regenerate"
  | "publisher.update"
  | "widget.update"
  | "organization.update"
  | "webhook.brevo.invalid_token"
  | "webhook.brevo.ip_not_allowed";

export type AuditOutcome = "success" | "denied";

export type AuditActor = {
  type: "anonymous" | "publisher" | "user";
  id?: string;
  role?: string;
};

export type AuditTarget = {
  type: string;
  id?: string;
};

export type AuditEvent = {
  action: AuditAction;
  outcome: AuditOutcome;
  target?: AuditTarget;
  metadata?: Record<string, unknown>;
};

export type AuditLog = AuditEvent & {
  type: "security_audit";
  actor: AuditActor;
  request_id?: string;
  method: string;
  path: string;
  status: number;
};

const AUDIT_EVENTS_KEY = "__auditEvents";
const SENSITIVE_KEYS = new Set(["apikey", "api_key", "apiKey", "authorization", "cookie", "password", "secret", "token"]);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const redactSensitiveValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    if (nestedValue === undefined) {
      return acc;
    }

    acc[key] = SENSITIVE_KEYS.has(key) ? "****" : redactSensitiveValue(nestedValue);
    return acc;
  }, {});
};

export const redactAuditMetadata = (metadata?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!metadata) {
    return undefined;
  }

  return redactSensitiveValue(metadata) as Record<string, unknown>;
};

export const getAuditEvents = (req: Request): AuditEvent[] => {
  return ((req as unknown as Record<string, AuditEvent[]>)[AUDIT_EVENTS_KEY] ?? []) as AuditEvent[];
};

export const appendAuditEvent = (req: Request, event: AuditEvent) => {
  const requestWithAudit = req as unknown as Record<string, AuditEvent[]>;
  requestWithAudit[AUDIT_EVENTS_KEY] = [...getAuditEvents(req), event];
};

export const buildAuditActor = (req: Request): AuditActor => {
  const user = req.user as { firstname?: unknown; id?: string; role?: string } | undefined;
  if (!user) {
    return { type: "anonymous" };
  }

  if ("firstname" in user) {
    return {
      type: "user",
      id: user.id,
      role: user.role,
    };
  }

  return {
    type: "publisher",
    id: user.id,
  };
};

export const buildAuditLog = (req: Request, res: Response, event: AuditEvent): AuditLog => {
  const requestId = (req as unknown as { requestId?: string }).requestId ?? req.header(REQUEST_ID_HEADER);

  return {
    type: "security_audit",
    action: event.action,
    outcome: event.outcome,
    actor: buildAuditActor(req),
    target: event.target,
    request_id: requestId,
    method: req.method,
    path: req.originalUrl.split("?")[0],
    status: res.statusCode,
    metadata: redactAuditMetadata(event.metadata),
  };
};
