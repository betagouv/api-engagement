import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPublisher, createTestWidget } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp({ auditLogs: true });

const getAuditLogs = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0]))).filter((log: { type?: string }) => log.type === "security_audit");

describe("Dashboard widget controller", () => {
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

  it("allows POST /widget/search for an authenticated user", async () => {
    const res = await request(app).post("/widget/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("rejects GET /widget/:id for another publisher widget", async () => {
    const otherPublisher = await createTestPublisher();
    const widget = await createTestWidget({ fromPublisher: otherPublisher });

    const res = await request(app).get(`/widget/${widget.id}`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("logs an audit event when updating a widget", async () => {
    const publisher = await createTestPublisher();
    const widget = await createTestWidget({ fromPublisher: publisher });
    const { token: adminToken } = await createTestUser({ role: "admin" });

    const res = await request(app).put(`/widget/${widget.id}`).set({ Authorization: `jwt ${adminToken}` }).set("x-request-id", "request-widget-update").send({
      name: "Updated widget",
      active: false,
    });

    expect(res.status).toBe(200);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "widget.update",
        outcome: "success",
        actor: expect.objectContaining({ type: "user", role: "admin" }),
        target: { type: "widget", id: widget.id },
        request_id: "request-widget-update",
        status: 200,
        metadata: { fields: ["name", "active"], fromPublisherId: publisher.id },
      })
    );
  });
});
