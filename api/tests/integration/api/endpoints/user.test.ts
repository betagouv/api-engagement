import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard user controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

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
});
