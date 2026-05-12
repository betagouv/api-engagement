import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { organizationService } from "@/services/organization";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp({ auditLogs: true });

const getAuditLogs = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0]))).filter((log: { type?: string }) => log.type === "security_audit");

describe("Dashboard organization controller", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let token: string;

  beforeEach(async () => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const publisher = await createTestPublisher({ moderator: true });
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisher.id] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects GET /organization/:id for a non-admin user", async () => {
    const organization = await organizationService.createOrganization({ title: "Test organization" });

    const res = await request(app).get(`/organization/${organization.id}`).set(authHeader());

    expect([401, 403]).toContain(res.status);
  });

  it("rejects PUT /organization/:id for a non-admin user", async () => {
    const organization = await organizationService.createOrganization({ title: "Test organization" });

    const res = await request(app).put(`/organization/${organization.id}`).set(authHeader()).send({ rna: "W123456789" });

    expect([401, 403]).toContain(res.status);
  });

  it("logs an audit event when updating an organization", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const organization = await organizationService.createOrganization({ title: "Test organization" });

    const res = await request(app).put(`/organization/${organization.id}`).set({ Authorization: `jwt ${adminToken}` }).set("x-request-id", "request-organization-update").send({
      rna: "W123456789",
    });

    expect(res.status).toBe(200);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "organization.update",
        outcome: "success",
        actor: expect.objectContaining({ type: "user", role: "admin" }),
        target: { type: "organization", id: organization.id },
        request_id: "request-organization-update",
        status: 200,
        metadata: { fields: ["rna"] },
      })
    );
  });
});
