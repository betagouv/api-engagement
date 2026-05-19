import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp({ auditLogs: true });

const getAuditLogs = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0]))).filter((log: { type?: string }) => log.type === "security_audit");

describe("Dashboard user controller", () => {
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

  it("allows GET /user/refresh for an authenticated user", async () => {
    const res = await request(app).get(`/user/refresh?publisherId=${publisherId}`).set(authHeader());

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows PUT /user for an authenticated user", async () => {
    const res = await request(app).put("/user").set(authHeader()).send({ firstname: "Test" });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("logs an audit event when a user access is denied", async () => {
    const { user: otherUser } = await createTestUser();

    const res = await request(app).get(`/user/${otherUser.id}`).set(authHeader()).set("x-request-id", "request-user-denied");

    expect(res.status).toBe(403);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "access.denied",
        outcome: "denied",
        actor: expect.objectContaining({ type: "user" }),
        request_id: "request-user-denied",
        status: 403,
      })
    );
  });

  it("logs an audit event when an admin uses loginas", async () => {
    const publisher = await createTestPublisher();
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const { user: targetUser } = await createTestUser({ publishers: [publisher.id] });

    const res = await request(app).get(`/user/loginas/${targetUser.id}`).set({ Authorization: `jwt ${adminToken}` }).set("x-request-id", "request-loginas");

    expect(res.status).toBe(200);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "user.login_as",
        outcome: "success",
        actor: expect.objectContaining({ type: "user", role: "admin" }),
        target: { type: "user", id: targetUser.id },
        request_id: "request-loginas",
        status: 200,
        metadata: { publisherId: publisher.id },
      })
    );
  });
});
