import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher, createTestWidget } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard widget controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

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
});
