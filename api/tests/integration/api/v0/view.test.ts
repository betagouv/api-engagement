import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

describe("View API Integration Tests", () => {
  const app = createTestApp();

  let apiKey: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ name: "View Publisher" });
    apiKey = publisher.apikey!;
    publisherId = publisher._id.toString();

    elasticMock.search.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.READ_STATS_FROM;
  });

  it("should return Elasticsearch stats", async () => {
    process.env.READ_STATS_FROM = "es";

    elasticMock.search.mockResolvedValue({
      body: {
        hits: { total: { value: 12 } },
        aggregations: {
          fromPublisherName: {
            buckets: [
              { key: "View Publisher", doc_count: 5 },
              { key: "Partner Publisher", doc_count: 3 },
            ],
          },
        },
      },
    });

    const response = await request(app).get("/v0/view/stats?facets=fromPublisherName").set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total: 12,
      facets: {
        fromPublisherName: [
          { key: "View Publisher", doc_count: 5 },
          { key: "Partner Publisher", doc_count: 3 },
        ],
      },
    });

    expect(elasticMock.search).toHaveBeenCalledTimes(1);
  });
});
