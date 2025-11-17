import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prismaCore } from "../../../../src/db/postgres";
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
    await prismaCore.statEvent.deleteMany({});
  });

  afterEach(async () => {
    await prismaCore.statEvent.deleteMany({});
  });

  it("returns stats aggregated from PostgreSQL", async () => {
    const otherPublisherId = "publisher-partner";

    await Promise.all(
      Array.from({ length: 5 }).map(() =>
        createStatEventFixture({
          type: "print",
          isBot: false,
          fromPublisherId: otherPublisherId,
          toPublisherId: publisherId,
        })
      )
    );

    await Promise.all(
      Array.from({ length: 3 }).map(() =>
        createStatEventFixture({
          type: "print",
          isBot: false,
          fromPublisherId: "partner-id",
          toPublisherId: publisherId,
        })
      )
    );

    const response = await request(app).get("/v0/view/stats?facets=fromPublisherId").set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(8);
    expect(response.body.facets.fromPublisherId).toEqual([
      { key: otherPublisherId, doc_count: 5 },
      { key: "partner-id", doc_count: 3 },
    ]);
  });
});
