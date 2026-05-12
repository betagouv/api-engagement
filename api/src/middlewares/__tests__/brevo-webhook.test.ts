import { beforeEach, describe, expect, it, vi } from "vitest";

const loadMiddleware = async ({ token = "test-token", allowlist = "1.179.112.0/20" } = {}) => {
  vi.resetModules();
  process.env.BREVO_WEBHOOK_TOKEN = token;
  process.env.BREVO_WEBHOOK_IP_ALLOWLIST = allowlist;

  const { brevoWebhookSecurity } = await import("@/middlewares/brevo-webhook");
  return brevoWebhookSecurity;
};

const callMiddleware = async ({
  authorization,
  ip = "1.179.112.1",
  xForwardedFor,
  xEnvoyExternalAddress,
}: {
  authorization?: string;
  ip?: string;
  xForwardedFor?: string;
  xEnvoyExternalAddress?: string;
}) => {
  const brevoWebhookSecurity = await loadMiddleware();
  const headers: Record<string, string | undefined> = {
    authorization,
    "x-forwarded-for": xForwardedFor,
    "x-envoy-external-address": xEnvoyExternalAddress,
  };
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
    ip,
    originalUrl: "/brevo-webhook",
  } as any;
  const res = {
    body: undefined as unknown,
    statusCode: undefined as number | undefined,
    status: vi.fn(function (this: any, statusCode: number) {
      this.statusCode = statusCode;
      return this;
    }),
    send: vi.fn(function (this: any, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  const next = vi.fn();

  brevoWebhookSecurity(req, res as any, next);

  return { next, res };
};

describe("brevoWebhookSecurity", () => {
  beforeEach(() => {
    delete process.env.BREVO_WEBHOOK_TOKEN;
    delete process.env.BREVO_WEBHOOK_IP_ALLOWLIST;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { res } = await callMiddleware({});

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("returns 401 when bearer token is invalid", async () => {
    const { res } = await callMiddleware({ authorization: "Bearer wrong-token" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("returns 403 when X-Forwarded-For source IP is not allowlisted", async () => {
    const { res } = await callMiddleware({ authorization: "Bearer test-token", ip: "100.96.0.53", xForwardedFor: "203.0.113.10" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("accepts a valid bearer token from an allowlisted X-Forwarded-For Brevo IP", async () => {
    const { next, res } = await callMiddleware({ authorization: "Bearer test-token", ip: "100.96.0.53", xForwardedFor: "1.179.112.1" });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("uses the first IP from an X-Forwarded-For chain", async () => {
    const { next, res } = await callMiddleware({ authorization: "Bearer test-token", ip: "100.96.0.53", xForwardedFor: "1.179.112.1, 100.96.0.53" });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts IPv4-mapped IPv6 addresses when the IPv4 is allowlisted", async () => {
    const { next, res } = await callMiddleware({ authorization: "Bearer test-token", ip: "100.96.0.53", xForwardedFor: "::ffff:1.179.112.1" });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("falls back to req.ip when proxy headers are missing", async () => {
    const { next, res } = await callMiddleware({ authorization: "Bearer test-token", ip: "1.179.112.1" });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
