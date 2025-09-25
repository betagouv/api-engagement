import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPublisher } from "../../../fixtures";
import { elasticMock, pgMock } from "../../../mocks";
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
    pgMock.statEvent.count.mockReset();
    pgMock.statEvent.groupBy.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.READ_STATS_FROM;
  });

  it("should return PostgreSQL stats when READ_STATS_FROM is pg", async () => {
    process.env.READ_STATS_FROM = "pg";

    pgMock.statEvent.count.mockResolvedValue(7);
    pgMock.statEvent.groupBy.mockResolvedValue([
      { from_publisher_name: "View Publisher", _count: { _all: 4 } },
      { from_publisher_name: "Partner Publisher", _count: { _all: 2 } },
    ]);

    const response = await request(app)
      .get("/v0/view/stats?facets=fromPublisherName")
      .set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total: 7,
      facets: {
        fromPublisherName: [
          { key: "View Publisher", doc_count: 4 },
          { key: "Partner Publisher", doc_count: 2 },
        ],
      },
    });

    expect(pgMock.statEvent.count).toHaveBeenCalledTimes(1);
    expect(pgMock.statEvent.groupBy).toHaveBeenCalledTimes(1);
    expect(elasticMock.search).not.toHaveBeenCalled();

    const [{ where }] = pgMock.statEvent.count.mock.calls[0];
    expect(where).toEqual({
      NOT: { is_bot: true },
      OR: [
        { to_publisher_id: publisherId },
        { from_publisher_id: publisherId },
      ],
    });
  });

  it("should return Elasticsearch stats when READ_STATS_FROM is es", async () => {
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

    const response = await request(app)
      .get("/v0/view/stats?facets=fromPublisherName")
      .set("x-api-key", apiKey);

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
    expect(pgMock.statEvent.count).not.toHaveBeenCalled();
    expect(pgMock.statEvent.groupBy).not.toHaveBeenCalled();
  });
});
