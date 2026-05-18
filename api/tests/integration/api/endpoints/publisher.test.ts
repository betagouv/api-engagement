import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard publisher controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

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

  it("rejects GET /publisher/:id/excluded-organizations for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/excluded-organizations`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("rejects GET /publisher/:id/moderated for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/moderated`).set(authHeader());

    expect(res.status).toBe(403);
  });
});
