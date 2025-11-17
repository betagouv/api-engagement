import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { createStatEventFixture } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

describe("View API Integration Tests", () => {
  const app = createTestApp();

  let apiKey: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ name: "View Publisher" });
    apiKey = publisher.apikey!;
    publisherId = publisher.id;
  });

  it("returns aggregated stats", async () => {
    const otherPublisher = await createTestPublisher({ name: "Other Publisher" });
    const otherPublisher2 = await createTestPublisher({ name: "Other Publisher 2" });

    await Promise.all(
      Array.from({ length: 5 }).map(() =>
        createStatEventFixture({
          type: "print",
          isBot: false,
          fromPublisherId: otherPublisher.id,
          toPublisherId: publisherId,
        })
      )
    );

    await Promise.all(
      Array.from({ length: 3 }).map(() =>
        createStatEventFixture({
          type: "print",
          isBot: false,
          fromPublisherId: otherPublisher2.id,
          toPublisherId: publisherId,
        })
      )
    );

    const response = await request(app).get("/v0/view/stats?facets=fromPublisherId").set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(8);
    expect(response.body.facets.fromPublisherId).toMatchObject([
      { key: otherPublisher.id, doc_count: 5 },
      { key: otherPublisher2.id, doc_count: 3 },
    ]);
  });
});
