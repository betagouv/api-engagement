import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { organizationService } from "@/services/organization";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard organization controller", () => {
  let token: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisher.id] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

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
});
