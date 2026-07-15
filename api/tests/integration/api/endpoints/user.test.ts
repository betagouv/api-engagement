import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { userService } from "@/services/user";
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

    const res = await request(app)
      .get(`/user/loginas/${targetUser.id}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .set("x-request-id", "request-loginas");

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

  describe("POST /user/signup", () => {
    const VALID_PASSWORD = "SuperSecret123!";

    const createInvitedUser = (data: Parameters<typeof createTestUser>[0] = {}) =>
      createTestUser({
        invitationToken: "invitation-token-test",
        invitationExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        ...data,
      });

    it("completes signup with a valid invitation token", async () => {
      const { user } = await createInvitedUser();

      const res = await request(app).post("/user/signup").send({ token: "invitation-token-test", firstname: "Jane", lastname: "Doe", password: VALID_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const updated = await userService.findUserById(user.id);
      expect(updated?.firstname).toBe("Jane");
      expect(updated?.invitationToken).toBeNull();
      expect(updated?.invitationExpiresAt).toBeNull();
      expect(updated?.invitationCompletedAt).not.toBeNull();

      const login = await request(app).post("/user/login").send({ email: user.email, password: VALID_PASSWORD });
      expect(login.status).toBe(200);
    });

    it("rejects an unknown invitation token without touching any account", async () => {
      const { user } = await createInvitedUser();

      const res = await request(app).post("/user/signup").send({ token: "wrong-token", firstname: "Evil", lastname: "Hacker", password: VALID_PASSWORD });

      expect(res.status).toBe(404);

      const untouched = await userService.findUserById(user.id);
      expect(untouched?.firstname).toBe(user.firstname);
      expect(untouched?.invitationToken).toBe("invitation-token-test");
    });

    it("rejects an expired invitation token", async () => {
      await createInvitedUser({ invitationExpiresAt: new Date(Date.now() - 1000) });

      const res = await request(app).post("/user/signup").send({ token: "invitation-token-test", firstname: "Jane", lastname: "Doe", password: VALID_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("REQUEST_EXPIRED");
    });

    it("rejects the legacy payload with a user id instead of a token", async () => {
      const { user } = await createInvitedUser();

      const res = await request(app).post("/user/signup").send({ id: user.id, firstname: "Evil", lastname: "Hacker", password: VALID_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_BODY");

      const untouched = await userService.findUserById(user.id);
      expect(untouched?.firstname).toBe(user.firstname);
    });

    it("rejects a weak password even with a valid token", async () => {
      await createInvitedUser();

      const res = await request(app).post("/user/signup").send({ token: "invitation-token-test", firstname: "Jane", lastname: "Doe", password: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_PASSWORD");
    });
  });

  describe("sensitive user fields", () => {
    const SENSITIVE_FIELDS = ["password", "invitationToken", "forgotPasswordToken", "forgotPasswordExpiresAt"];

    const expectPublicUser = (user: Record<string, unknown>) => {
      expect(user.email).toBeTruthy();
      for (const field of SENSITIVE_FIELDS) {
        expect(user).not.toHaveProperty(field);
      }
    };

    it("strips sensitive fields from POST /user/search results, admin included", async () => {
      const { token: adminToken } = await createTestUser({ role: "admin" });
      await createTestUser({
        password: "SuperSecret123!",
        invitationToken: "secret-invitation-token",
        forgotPasswordToken: "secret-forgot-token",
        forgotPasswordExpiresAt: new Date(Date.now() + 1000 * 60),
      });

      const res = await request(app)
        .post("/user/search")
        .set({ Authorization: `jwt ${adminToken}` })
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(expectPublicUser);
    });

    it("strips sensitive fields from POST /user/login and GET /user/refresh", async () => {
      const { user } = await createTestUser({ password: "SuperSecret123!", publishers: [publisherId] });

      const login = await request(app).post("/user/login").send({ email: user.email, password: "SuperSecret123!" });
      expect(login.status).toBe(200);
      expectPublicUser(login.body.data.user);

      const refresh = await request(app)
        .get("/user/refresh")
        .set({ Authorization: `jwt ${login.body.data.token}` });
      expect(refresh.status).toBe(200);
      expectPublicUser(refresh.body.data.user);
    });

    it("strips sensitive fields from GET /user/:id and GET /user/loginas/:id", async () => {
      const { token: adminToken } = await createTestUser({ role: "admin" });
      const { user: targetUser } = await createTestUser({ password: "SuperSecret123!", publishers: [publisherId] });

      const getOne = await request(app)
        .get(`/user/${targetUser.id}`)
        .set({ Authorization: `jwt ${adminToken}` });
      expect(getOne.status).toBe(200);
      expectPublicUser(getOne.body.data);

      const loginas = await request(app)
        .get(`/user/loginas/${targetUser.id}`)
        .set({ Authorization: `jwt ${adminToken}` });
      expect(loginas.status).toBe(200);
      expectPublicUser(loginas.body.data.user);
    });

    it("does not echo tokens back from POST /user/verify-token", async () => {
      await createTestUser({
        invitationToken: "invitation-token-verify",
        invitationExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      const res = await request(app).post("/user/verify-token").send({ token: "invitation-token-verify" });

      expect(res.status).toBe(200);
      expectPublicUser(res.body.data);
    });
  });
});
