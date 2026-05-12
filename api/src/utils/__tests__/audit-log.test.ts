import { Request, Response } from "express";
import { describe, expect, it } from "vitest";

import { appendAuditEvent, buildAuditActor, buildAuditLog, getAuditEvents, redactAuditMetadata } from "@/utils/audit-log";

const buildRequest = (overrides: Partial<Request> & { requestId?: string; user?: unknown } = {}) =>
  ({
    method: "POST",
    originalUrl: "/publisher/123/apikey?debug=true",
    header: (name: string) => (name === "x-request-id" ? "header-request-id" : undefined),
    ...overrides,
  }) as Request;

const buildResponse = (statusCode = 200) =>
  ({
    statusCode,
  }) as Response;

describe("audit-log utils", () => {
  it("normalise un acteur utilisateur", () => {
    const req = buildRequest({ user: { id: "user-1", firstname: "Jane", role: "admin" } });

    expect(buildAuditActor(req)).toEqual({ type: "user", id: "user-1", role: "admin" });
  });

  it("normalise un acteur publisher", () => {
    const req = buildRequest({ user: { id: "publisher-1", name: "Publisher" } });

    expect(buildAuditActor(req)).toEqual({ type: "publisher", id: "publisher-1" });
  });

  it("stocke les événements d'audit sur la requête", () => {
    const req = buildRequest();

    appendAuditEvent(req, {
      action: "publisher.api_key.regenerate",
      outcome: "success",
      target: { type: "publisher", id: "publisher-1" },
    });

    expect(getAuditEvents(req)).toEqual([
      {
        action: "publisher.api_key.regenerate",
        outcome: "success",
        target: { type: "publisher", id: "publisher-1" },
      },
    ]);
  });

  it("construit un log d'audit avec request_id, chemin et statut", () => {
    const req = buildRequest({ requestId: "request-1", user: { id: "user-1", firstname: "Jane", role: "admin" } });
    const res = buildResponse(403);

    expect(
      buildAuditLog(req, res, {
        action: "access.denied",
        outcome: "denied",
        target: { type: "route", id: "/publisher/:id" },
      })
    ).toEqual({
      type: "security_audit",
      action: "access.denied",
      outcome: "denied",
      actor: { type: "user", id: "user-1", role: "admin" },
      target: { type: "route", id: "/publisher/:id" },
      request_id: "request-1",
      method: "POST",
      path: "/publisher/123/apikey",
      status: 403,
      metadata: undefined,
    });
  });

  it("redige les champs sensibles dans les metadata", () => {
    expect(
      redactAuditMetadata({
        apikey: "secret-api-key",
        password: "secret-password",
        nested: {
          token: "secret-token",
          kept: "value",
        },
      })
    ).toEqual({
      apikey: "****",
      password: "****",
      nested: {
        token: "****",
        kept: "value",
      },
    });
  });
});
