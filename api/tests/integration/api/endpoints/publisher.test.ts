import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp({ auditLogs: true });

const getAuditLogs = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0]))).filter((log: { type?: string }) => log.type === "security_audit");

describe("Dashboard publisher controller", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows POST /publisher/search for an authenticated user", async () => {
    const res = await request(app).post("/publisher/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows GET /publisher/:id for an accessible publisher", async () => {
    const res = await request(app).get(`/publisher/${publisherId}`).set(authHeader());

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("rejects POST /publisher/:id/apikey for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).post(`/publisher/${otherPublisher.id}/apikey`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("rejects POST /publisher/:id/image for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).post(`/publisher/${otherPublisher.id}/image`).set(authHeader()).attach("files", Buffer.from("logo"), "logo.png");

    expect(res.status).toBe(403);
  });

  it("rejects GET /publisher/:id/diffusion-rules for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/diffusion-rules`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("rejects GET /publisher/:id/moderated for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/moderated`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("logs an audit event when regenerating a publisher API key", async () => {
    const res = await request(app).post(`/publisher/${publisherId}/apikey`).set(authHeader()).set("x-request-id", "request-api-key");

    expect(res.status).toBe(200);
    expect(JSON.stringify(getAuditLogs(consoleInfoSpy))).not.toContain(res.body.data);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "publisher.api_key.regenerate",
        outcome: "success",
        actor: expect.objectContaining({ type: "user" }),
        target: { type: "publisher", id: publisherId },
        request_id: "request-api-key",
        status: 200,
      })
    );
  });

  it("logs an audit event when updating a publisher", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });

    const res = await request(app)
      .put(`/publisher/${publisherId}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .set("x-request-id", "request-publisher-update")
      .send({
        name: "Updated publisher",
      });

    expect(res.status).toBe(200);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "publisher.update",
        outcome: "success",
        actor: expect.objectContaining({ type: "user", role: "admin" }),
        target: { type: "publisher", id: publisherId },
        request_id: "request-publisher-update",
        status: 200,
        metadata: { fields: ["name"] },
      })
    );
  });
});
