import { beforeEach, describe, expect, it, vi } from "vitest";

const loadMiddleware = async ({ token = "test-token" } = {}) => {
  vi.resetModules();
  process.env.BREVO_WEBHOOK_TOKEN = token;

  const { brevoWebhookSecurity } = await import("@/middlewares/brevo-webhook");
  return brevoWebhookSecurity;
};

const callMiddleware = async ({ authorization }: { authorization?: string }) => {
  const brevoWebhookSecurity = await loadMiddleware();
  const headers: Record<string, string | undefined> = { authorization };
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
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

  it("accepts a valid bearer token without checking the source IP", async () => {
    const { next, res } = await callMiddleware({ authorization: "Bearer test-token" });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
