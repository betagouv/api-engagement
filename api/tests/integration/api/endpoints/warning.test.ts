import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard warning controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows GET /warning/state for an authenticated user", async () => {
    const res = await request(app).get("/warning/state").set(authHeader());

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows POST /warning/search for an accessible publisher", async () => {
    const res = await request(app).post("/warning/search").set(authHeader()).send({ publisherId });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
