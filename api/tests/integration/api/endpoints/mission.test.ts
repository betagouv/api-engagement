import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard mission controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows POST /mission/search for an authenticated user", async () => {
    const res = await request(app).post("/mission/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows GET /mission/:id for the owner publisher", async () => {
    const mission = await createTestMission({ publisherId });

    const res = await request(app).get(`/mission/${mission.id}`).set(authHeader());

    expect(res.status).toBe(200);
  });

  it("allows GET /mission/:id for a linked moderator publisher", async () => {
    await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER, moderator: true });
    const { token: moderatorToken } = await createTestUser({ role: "user", publishers: [PUBLISHER_IDS.JEVEUXAIDER] });
    const otherPublisher = await createTestPublisher();
    const mission = await createTestMission({ publisherId: otherPublisher.id });

    const res = await request(app)
      .get(`/mission/${mission.id}`)
      .set({ Authorization: `jwt ${moderatorToken}` });

    expect(res.status).toBe(200);
  });

  it("rejects GET /mission/:id for another publisher mission", async () => {
    const otherPublisher = await createTestPublisher();
    const mission = await createTestMission({ publisherId: otherPublisher.id });

    const res = await request(app).get(`/mission/${mission.id}`).set(authHeader());

    expect(res.status).toBe(403);
  });
});
