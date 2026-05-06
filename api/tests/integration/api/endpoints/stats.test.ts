import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createStatEventFixture } from "../../../fixtures/stat-event";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard stats controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows POST /stats/search for an accessible publisher", async () => {
    const res = await request(app).post("/stats/search").set(authHeader()).send({ fromPublisherId: publisherId });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("rejects POST /stats/search without an accessible publisher", async () => {
    const otherPublisher = await createTestPublisher();
    await createStatEventFixture({ fromPublisherId: otherPublisher.id, toPublisherId: otherPublisher.id });

    const res = await request(app).post("/stats/search").set(authHeader()).send({ fromPublisherId: otherPublisher.id });

    expect(res.status).toBe(403);
  });

  it("rejects POST /stats/search when only one of two publishers is accessible", async () => {
    const otherPublisher = await createTestPublisher();
    await createStatEventFixture({ fromPublisherId: publisherId, toPublisherId: otherPublisher.id });

    const res = await request(app).post("/stats/search").set(authHeader()).send({ fromPublisherId: publisherId, toPublisherId: otherPublisher.id });

    expect(res.status).toBe(403);
  });
});
