import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { campaignService } from "@/services/campaign";
import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard campaign controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows POST /campaign/search for an authenticated user", async () => {
    const res = await request(app).post("/campaign/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("rejects GET /campaign/:id for another publisher campaign", async () => {
    const otherPublisher = await createTestPublisher();
    const targetPublisher = await createTestPublisher();
    const campaign = await campaignService.createCampaign({
      name: "Forbidden campaign",
      type: "AD_BANNER",
      url: "https://example.com",
      fromPublisherId: otherPublisher.id,
      toPublisherId: targetPublisher.id,
      trackers: [],
    });

    const res = await request(app).get(`/campaign/${campaign.id}`).set(authHeader());

    expect(res.status).toBe(403);
  });
});
