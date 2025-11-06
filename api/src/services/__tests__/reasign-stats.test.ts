import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elasticMock, pgMock } from "../../../tests/mocks";
import { STATS_INDEX } from "../../config";

vi.mock("../../db/postgres/prismaCore", () => ({
  default: pgMock,
}));

import { reassignStats } from "../reassign-stats";

describe("reassignStats", () => {
  beforeEach(() => {
    elasticMock.search.mockReset();
    elasticMock.scroll.mockReset();
    elasticMock.bulk.mockReset();
    pgMock.statEvent.updateMany.mockReset();
    delete process.env.WRITE_STATS_DUAL;
  });

  afterEach(() => {
    delete process.env.WRITE_STATS_DUAL;
  });

  it("updates stats only in elasticsearch when dual write is disabled", async () => {
    elasticMock.search.mockResolvedValue({
      body: {
        _scroll_id: "scroll-1",
        hits: { hits: [{ _id: "stat-1", _source: {} }] },
      },
    });
    elasticMock.scroll.mockResolvedValue({
      body: {
        _scroll_id: "scroll-2",
        hits: { hits: [] },
      },
    });
    elasticMock.bulk.mockResolvedValue({
      body: {
        items: [{ update: { _id: "stat-1" } }],
        errors: false,
      },
    });

    const processed = await reassignStats({ sourceId: "campaign-1", fromPublisherId: "publisher-1" }, { toPublisherId: "publisher-2", toPublisherName: "Publisher 2" });

    expect(processed).toBe(1);

    expect(elasticMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: STATS_INDEX,
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { "sourceId.keyword": "campaign-1" } }, { term: { "fromPublisherId.keyword": "publisher-1" } }]),
            }),
          }),
        }),
      })
    );

    expect(elasticMock.bulk).toHaveBeenCalledWith({
      refresh: true,
      body: [{ update: { _index: expect.any(String), _id: "stat-1" } }, { doc: { toPublisherId: "publisher-2", toPublisherName: "Publisher 2" } }],
    });

    expect(pgMock.statEvent.updateMany).not.toHaveBeenCalled();
  });

  it("updates stats in postgres when dual write is enabled", async () => {
    process.env.WRITE_STATS_DUAL = "true";

    elasticMock.search.mockResolvedValue({
      body: {
        _scroll_id: "scroll-1",
        hits: { hits: [{ _id: "stat-1", _source: {} }] },
      },
    });
    elasticMock.scroll.mockResolvedValue({
      body: {
        _scroll_id: "scroll-2",
        hits: { hits: [] },
      },
    });
    elasticMock.bulk.mockResolvedValue({
      body: {
        items: [{ update: { _id: "stat-1" } }],
        errors: false,
      },
    });

    const processed = await reassignStats({ sourceId: "campaign-1", fromPublisherId: "publisher-1" }, { fromPublisherId: "publisher-2", fromPublisherName: "New Publisher" });

    expect(processed).toBe(1);

    expect(pgMock.statEvent.updateMany).toHaveBeenCalledWith({
      where: { source_id: "campaign-1", from_publisher_id: "publisher-1" },
      data: { from_publisher_id: "publisher-2", from_publisher_name: "New Publisher" },
    });
  });
});
