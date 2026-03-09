import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestUser } from "../../fixtures/user";
import { createTestApp } from "../../testApp";

const app = createTestApp();

/**
 * Access tests for dashboard endpoints for users with role: "user".
 *
 * Goal: ensure none of these endpoints return 401 or 403 with a valid user token.
 * A regression (endpoint becoming admin-only) would fail these tests before reaching the frontend.
 *
 * Each test only checks the authentication/authorization status (≠ 401, ≠ 403).
 * Statuses 200, 404, etc. are acceptable — they prove authentication succeeded.
 */
describe("Endpoints accessible to users (≠ 401, ≠ 403)", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("GET /user/refresh", async () => {
    const res = await request(app).get(`/user/refresh?publisherId=${publisherId}`).set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("PUT /user", async () => {
    const res = await request(app).put("/user").set(authHeader()).send({ firstname: "Test" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /publisher/search", async () => {
    const res = await request(app).post("/publisher/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("GET /publisher/:id", async () => {
    const res = await request(app).get(`/publisher/${publisherId}`).set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /campaign/search", async () => {
    const res = await request(app).post("/campaign/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /widget/search", async () => {
    const res = await request(app).post("/widget/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /mission/search", async () => {
    const res = await request(app).post("/mission/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /moderation/search", async () => {
    // moderatorId is required — we pass the publisher created in setup (moderator: true)
    const res = await request(app).post("/moderation/search").set(authHeader()).send({ moderatorId: publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /import/search", async () => {
    // publisherId required for users (authorization check in controller)
    const res = await request(app).post("/import/search").set(authHeader()).send({ publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /stats/search", async () => {
    const res = await request(app).post("/stats/search").set(authHeader()).send({ fromPublisherId: publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("GET /warning/state", async () => {
    const res = await request(app).get("/warning/state").set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /warning/search", async () => {
    // publisherId required for users (authorization check in controller)
    const res = await request(app).post("/warning/search").set(authHeader()).send({ publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
