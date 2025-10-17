import { beforeEach, describe, expect, it, vi } from "vitest";
import statEventRepository from "../../../src/repositories/stat-event";
import { Stats } from "../../../src/types";
import { elasticMock, pgMock } from "../../../tests/mocks";

const baseEvent: Partial<Stats> = {
  type: "click",
  createdAt: new Date(),
  origin: "",
  referer: "",
  userAgent: "",
  host: "",
  isBot: false,
  isHuman: true,
  source: "publisher",
  sourceId: "",
  sourceName: "",
  status: "PENDING",
  toPublisherId: "",
  toPublisherName: "",
};

describe("stat-event repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createStatEvent method", () => {
    it("dual writes when enabled", async () => {
      initFeatureFlags("es", "true");
      await statEventRepository.createStatEvent(baseEvent as Stats);
      expect(elasticMock.index).toHaveBeenCalled();
      expect(pgMock.statEvent.create).toHaveBeenCalled();
    });
  });

  describe("getStatEventById method", () => {
    it("reads from elastic when configured", async () => {
      elasticMock.get.mockResolvedValueOnce({ body: { _source: { foo: "bar" }, _id: "1" } });
      initFeatureFlags("es");
      const res = await statEventRepository.getStatEventById("1");
      expect(elasticMock.get).toHaveBeenCalled();
      expect(pgMock.statEvent.findUnique).not.toHaveBeenCalled();
      expect(res).toEqual({ foo: "bar", _id: "1" });
    });

    it("reads from postgres when configured", async () => {
      pgMock.statEvent.findUnique.mockResolvedValueOnce({
        id: "1",
        type: "click",
        created_at: new Date(),
        origin: "",
        referer: "",
        user_agent: "",
        host: "",
        is_bot: false,
        is_human: true,
        source: "publisher",
        source_id: "",
        source_name: "",
        status: "PENDING",
        to_publisher_id: "",
        to_publisher_name: "",
      });
      initFeatureFlags("pg");
      const res = await statEventRepository.getStatEventById("1");
      expect(pgMock.statEvent.findUnique).toHaveBeenCalled();
      expect(elasticMock.get).not.toHaveBeenCalled();
      expect(res?._id).toBe("1");
    });
  });

  describe("findFirstByMissionId method", () => {
    it("finds events by missionId from elasticsearch", async () => {
      elasticMock.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [
              {
                _id: "event-1",
                _source: {
                  type: "click",
                  createdAt: new Date(),
                  origin: "",
                  referer: "",
                  userAgent: "",
                  host: "",
                  isBot: false,
                  isHuman: true,
                  source: "publisher",
                  sourceId: "",
                  sourceName: "",
                  status: "PENDING",
                  fromPublisherId: "",
                  fromPublisherName: "",
                  toPublisherId: "",
                  toPublisherName: "",
                  missionId: "mission-1",
                },
              },
            ],
          },
        },
      });

      initFeatureFlags("es");

      const res = await statEventRepository.findFirstByMissionId("mission-1");

      expect(elasticMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: { term: { "missionId.keyword": "mission-1" } },
            size: 1,
          },
        })
      );
      expect(pgMock.statEvent.findFirst).not.toHaveBeenCalled();
      expect(res?._id).toBe("event-1");
    });

    it("finds events by missionId from postgres", async () => {
      const createdAt = new Date();
      pgMock.statEvent.findFirst.mockResolvedValueOnce({
        id: "event-2",
        type: "click",
        created_at: createdAt,
        origin: "",
        referer: "",
        user_agent: "",
        host: "",
        is_bot: false,
        is_human: true,
        source: "publisher",
        source_id: "",
        source_name: "",
        status: "PENDING",
        from_publisher_id: "",
        from_publisher_name: "",
        to_publisher_id: "",
        to_publisher_name: "",
        mission_id: "mission-1",
      });

      initFeatureFlags("pg");

      const res = await statEventRepository.findFirstByMissionId("mission-1");

      expect(pgMock.statEvent.findFirst).toHaveBeenCalledWith({
        where: { mission_id: "mission-1" },
        orderBy: { created_at: "desc" },
      });
      expect(elasticMock.search).not.toHaveBeenCalled();
      expect(res?._id).toBe("event-2");
    });
  });

  describe("updateStatEventById method", () => {
    it("updates only provided fields when dual writing", async () => {
      initFeatureFlags("es", "true");

      await statEventRepository.updateStatEventById("event-id", { status: "VALIDATED" });

      expect(pgMock.statEvent.update).toHaveBeenCalledWith({
        where: { id: "event-id" },
        data: { status: "VALIDATED" },
      });
      expect(elasticMock.update).toHaveBeenCalledWith({
        index: expect.any(String),
        id: "event-id",
        body: { doc: { status: "VALIDATED" } },
      });
    });

    it("updates only provided fields in ES only when no dual writing", async () => {
      initFeatureFlags("es", "false");
      const patch: Partial<Stats> = { sourceName: "updated", isHuman: false };

      await statEventRepository.updateStatEventById("event-id", patch);

      expect(elasticMock.update).toHaveBeenCalledWith({
        index: expect.any(String),
        id: "event-id",
        body: { doc: patch },
      });
      expect(pgMock.statEvent.update).not.toHaveBeenCalled();
    });
  });

  describe("countByTypeSince method", () => {
    it("aggregates counts by type from elasticsearch", async () => {
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            click: { doc_count: 42 },
            apply: { doc_count: 5 },
          },
        },
      });
      initFeatureFlags("es");

      const res = await statEventRepository.countByTypeSince({
        publisherId: "pub-1",
        from: new Date(),
        types: ["click", "apply"],
      });

      expect(elasticMock.search).toHaveBeenCalled();
      expect(pgMock.statEvent.count).not.toHaveBeenCalled();
      expect(res).toMatchObject({ click: 42, apply: 5 });
    });

    it("aggregates counts by type from postgres", async () => {
      pgMock.statEvent.count.mockResolvedValueOnce(12);
      pgMock.statEvent.count.mockResolvedValueOnce(0);

      initFeatureFlags("pg");

      const res = await statEventRepository.countByTypeSince({
        publisherId: "pub-1",
        from: new Date(),
        types: ["click", "apply"],
      });

      expect(pgMock.statEvent.count).toHaveBeenCalledTimes(2);
      expect(elasticMock.search).not.toHaveBeenCalled();
      expect(res).toMatchObject({ click: 12, apply: 0 });
    });
  });

  describe("countClicksByPublisherForOrganizationSince method", () => {
    it("aggregates click counts by publisher from elasticsearch", async () => {
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            fromPublisherId: {
              buckets: [
                { key: "pub-1", doc_count: 3 },
                { key: "pub-2", doc_count: 0 },
              ],
            },
          },
        },
      });

      initFeatureFlags("es");

      const res = await statEventRepository.countClicksByPublisherForOrganizationSince({
        publisherIds: ["pub-1", "pub-2"],
        organizationClientId: "org-1",
        from: new Date(),
      });

      expect(elasticMock.search).toHaveBeenCalled();
      expect(pgMock.statEvent.groupBy).not.toHaveBeenCalled();
      expect(res).toMatchObject({ "pub-1": 3, "pub-2": 0 });
    });

    it("aggregates click counts by publisher from postgres", async () => {
      pgMock.statEvent.groupBy.mockResolvedValueOnce([{ from_publisher_id: "pub-1", _count: { _all: 5 } }]);

      initFeatureFlags("pg");

      const res = await statEventRepository.countClicksByPublisherForOrganizationSince({
        publisherIds: ["pub-1", "pub-2"],
        organizationClientId: "org-1",
        from: new Date(),
      });

      expect(pgMock.statEvent.groupBy).toHaveBeenCalledWith({
        by: ["from_publisher_id"],
        where: {
          type: "click",
          is_bot: { not: true },
          mission_organization_client_id: "org-1",
          from_publisher_id: { in: ["pub-1", "pub-2"] },
          created_at: { gte: expect.any(Date) },
        },
        _count: { _all: true },
      });
      expect(elasticMock.search).not.toHaveBeenCalled();
      expect(res).toMatchObject({ "pub-1": 5 });
    });
  });

  describe("searchStatEvents method", () => {
    it("searches stat events from elasticsearch", async () => {
      const createdAt = new Date().toISOString();
      elasticMock.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [
              {
                _id: "event-1",
                _source: {
                  ...baseEvent,
                  createdAt,
                  fromPublisherId: "pub-1",
                  toPublisherId: "pub-2",
                  sourceId: "src-1",
                },
              },
            ],
            total: { value: 1 },
          },
        },
      });

      initFeatureFlags("es");

      const res = await statEventRepository.searchStatEvents({
        fromPublisherId: "pub-1",
        toPublisherId: "pub-2",
        type: "click",
        sourceId: "src-1",
        size: 10,
        skip: 5,
      });

      expect(elasticMock.search).toHaveBeenCalledWith({
        index: expect.any(String),
        body: expect.objectContaining({
          track_total_hits: true,
          sort: [{ createdAt: { order: "desc" } }],
          size: 10,
          from: 5,
          query: {
            bool: {
              must: [],
              must_not: [{ term: { isBot: true } }],
              should: [],
              filter: [{ term: { fromPublisherId: "pub-1" } }, { term: { toPublisherId: "pub-2" } }, { term: { type: "click" } }, { term: { sourceId: "src-1" } }],
            },
          },
        }),
      });
      expect(pgMock.statEvent.findMany).not.toHaveBeenCalled();
      expect(res).toEqual([
        expect.objectContaining({
          _id: "event-1",
          type: "click",
          sourceId: "src-1",
          fromPublisherId: "pub-1",
          toPublisherId: "pub-2",
        }),
      ]);
    });

    it("searches stat events from postgres", async () => {
      const createdAt = new Date();
      pgMock.statEvent.findMany.mockResolvedValueOnce([
        {
          id: "event-2",
          type: "apply",
          created_at: createdAt,
          origin: "",
          referer: "",
          user_agent: "",
          host: "",
          is_bot: false,
          is_human: true,
          source: "publisher",
          source_id: "src-2",
          source_name: "",
          status: "PENDING",
          from_publisher_id: "pub-2",
          from_publisher_name: "",
          to_publisher_id: "pub-3",
          to_publisher_name: "",
        },
      ]);
      initFeatureFlags("pg");

      const res = await statEventRepository.searchStatEvents({
        fromPublisherId: "pub-2",
        toPublisherId: "pub-3",
        type: "apply",
        sourceId: "src-2",
        size: 5,
        skip: 2,
      });

      expect(pgMock.statEvent.findMany).toHaveBeenCalledWith({
        where: {
          is_bot: false,
          from_publisher_id: "pub-2",
          to_publisher_id: "pub-3",
          type: "apply",
          source_id: "src-2",
        },
        orderBy: { created_at: "desc" },
        skip: 2,
        take: 5,
      });
      expect(pgMock.statEvent.count).not.toHaveBeenCalled();
      expect(elasticMock.search).not.toHaveBeenCalled();
      expect(res).toEqual([
        expect.objectContaining({
          _id: "event-2",
          type: "apply",
          createdAt,
          sourceId: "src-2",
        }),
      ]);
    });
  });

  describe("searchViewStats method", () => {
    it("searches view stats from elasticsearch", async () => {
      const aggregationBuckets = [{ key: "click", doc_count: 4 }];
      elasticMock.search.mockResolvedValueOnce({
        body: {
          hits: { total: { value: 4 } },
          aggregations: { type: { buckets: aggregationBuckets } },
        },
      });

      initFeatureFlags("es");

      const fromDate = new Date("2024-01-01T00:00:00.000Z");

      const res = await statEventRepository.searchViewStats({
        publisherId: "pub-1",
        size: 5,
        filters: {
          fromPublisherName: "Alice",
          createdAt: [{ operator: "gt", date: fromDate }],
        },
        facets: ["type"],
      });

      expect(elasticMock.search).toHaveBeenCalledWith({
        index: expect.any(String),
        body: expect.objectContaining({
          size: 5,
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([{ term: { "fromPublisherName.keyword": "Alice" } }, { range: { createdAt: { gt: fromDate } } }]),
              should: [{ term: { "toPublisherId.keyword": "pub-1" } }, { term: { "fromPublisherId.keyword": "pub-1" } }],
            }),
          }),
          aggs: { type: { terms: { field: "type.keyword", size: 5 } } },
        }),
      });
      expect(res).toEqual({ total: 4, facets: { type: aggregationBuckets } });
    });

    it("searches view stats from postgres", async () => {
      pgMock.statEvent.count.mockResolvedValueOnce(7);
      pgMock.statEvent.groupBy.mockResolvedValueOnce([
        { type: "click", _count: { _all: 5 } },
        { type: "apply", _count: { _all: 2 } },
      ]);

      initFeatureFlags("pg");

      const fromDate = new Date("2024-01-01T00:00:00.000Z");
      const toDate = new Date("2024-02-01T00:00:00.000Z");

      const res = await statEventRepository.searchViewStats({
        publisherId: "pub-1",
        filters: {
          toPublisherId: "pub-2",
          source: "api",
          createdAt: [
            { operator: "gt", date: fromDate },
            { operator: "lt", date: toDate },
          ],
        },
        facets: ["type"],
      });

      expect(pgMock.statEvent.count).toHaveBeenCalledWith({
        where: {
          NOT: { is_bot: true },
          OR: [{ to_publisher_id: "pub-1" }, { from_publisher_id: "pub-1" }],
          AND: [{ to_publisher_id: "pub-2" }, { source: "api" }, { created_at: { gt: fromDate, lt: toDate } }],
        },
      });
      expect(pgMock.statEvent.groupBy).toHaveBeenCalledWith({
        by: ["type"],
        where: expect.any(Object),
        _count: { _all: true },
        orderBy: { _count: { _all: "desc" } },
        take: 10,
      });

      expect(res).toEqual({
        total: 7,
        facets: {
          type: [
            { key: "click", doc_count: 5 },
            { key: "apply", doc_count: 2 },
          ],
        },
      });
    });
  });

  describe("aggregateMissionStats method", () => {
    it("aggregates mission stats from elasticsearch", async () => {
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            click: { doc_count: 12, data: { value: 4 } },
            print: { doc_count: 18, data: { value: 6 } },
            apply: { doc_count: 7, data: { value: 3 } },
            account: { doc_count: 2, data: { value: 1 } },
          },
        },
      });

      initFeatureFlags("es");

      const res = await statEventRepository.aggregateMissionStats({
        from: new Date("2024-01-01"),
        to: new Date("2024-01-02"),
        excludeToPublisherName: "Service Civique",
      });

      expect(elasticMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.any(String),
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must_not: expect.arrayContaining([{ term: { "toPublisherName.keyword": "Service Civique" } }]),
              }),
            }),
          }),
        })
      );

      expect(res).toEqual({
        click: { eventCount: 12, missionCount: 4 },
        print: { eventCount: 18, missionCount: 6 },
        apply: { eventCount: 7, missionCount: 3 },
        account: { eventCount: 2, missionCount: 1 },
      });
    });

    it("aggregates mission stats from postgres", async () => {
      pgMock.statEvent.count
        .mockResolvedValueOnce(10) // click events
        .mockResolvedValueOnce(3) // click missions
        .mockResolvedValueOnce(20) // print events
        .mockResolvedValueOnce(5) // print missions
        .mockResolvedValueOnce(4) // apply events
        .mockResolvedValueOnce(2) // apply missions
        .mockResolvedValueOnce(1) // account events
        .mockResolvedValueOnce(1); // account missions

      initFeatureFlags("pg");

      const res = await statEventRepository.aggregateMissionStats({
        from: new Date("2024-01-01"),
        to: new Date("2024-01-02"),
        toPublisherName: "Service Civique",
        excludeUsers: ["bot"],
      });

      expect(pgMock.statEvent.count).toHaveBeenCalledTimes(8);
      expect(pgMock.statEvent.count).toHaveBeenCalledWith({
        where: {
          created_at: { gte: expect.any(Date), lt: expect.any(Date) },
          type: "click",
          AND: [{ to_publisher_name: "Service Civique" }, { NOT: { user: { in: ["bot"] } } }],
        },
      });
      expect(pgMock.statEvent.count).toHaveBeenCalledWith({
        where: {
          created_at: { gte: expect.any(Date), lt: expect.any(Date) },
          type: "click",
          AND: [{ to_publisher_name: "Service Civique" }, { NOT: { user: { in: ["bot"] } } }],
          mission_id: { not: null },
        },
        distinct: ["mission_id"],
      });

      expect(res).toEqual({
        click: { eventCount: 10, missionCount: 3 },
        print: { eventCount: 20, missionCount: 5 },
        apply: { eventCount: 4, missionCount: 2 },
        account: { eventCount: 1, missionCount: 1 },
      });
    });
  });

  describe("aggregateWarningBotStatsByUser method", () => {
    it("aggregates warning bot stats from elasticsearch", async () => {
      elasticMock.search.mockResolvedValueOnce({
        body: {
          aggregations: {
            type: { buckets: [{ key: "click", doc_count: 5 }] },
            publisherTo: { buckets: [{ key: "pub-to", doc_count: 3 }] },
            publisherFrom: { buckets: [{ key: "pub-from", doc_count: 2 }] },
          },
        },
      });

      initFeatureFlags("es");

      const res = await statEventRepository.aggregateWarningBotStatsByUser("user-1");

      expect(elasticMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.any(String),
          body: {
            query: { term: { user: "user-1" } },
            size: 0,
            aggs: {
              type: { terms: { field: "type.keyword" } },
              publisherTo: { terms: { field: "toPublisherId.keyword" } },
              publisherFrom: { terms: { field: "fromPublisherId.keyword" } },
            },
          },
        })
      );

      expect(pgMock.statEvent.groupBy).not.toHaveBeenCalled();
      expect(res).toEqual({
        type: [{ key: "click", doc_count: 5 }],
        publisherTo: [{ key: "pub-to", doc_count: 3 }],
        publisherFrom: [{ key: "pub-from", doc_count: 2 }],
      });
    });

    it("aggregates warning bot stats from postgres", async () => {
      pgMock.statEvent.groupBy
        .mockResolvedValueOnce([{ type: "click", _count: { _all: 4 } }])
        .mockResolvedValueOnce([{ to_publisher_id: "pub-to", _count: { _all: 2 } }])
        .mockResolvedValueOnce([{ from_publisher_id: "pub-from", _count: { _all: 1 } }]);

      initFeatureFlags("pg");

      const res = await statEventRepository.aggregateWarningBotStatsByUser("user-1");

      expect(pgMock.statEvent.groupBy).toHaveBeenNthCalledWith(1, {
        by: ["type"],
        where: { user: "user-1" },
        _count: { _all: true },
      });
      expect(pgMock.statEvent.groupBy).toHaveBeenNthCalledWith(2, {
        by: ["to_publisher_id"],
        where: { user: "user-1" },
        _count: { _all: true },
      });
      expect(pgMock.statEvent.groupBy).toHaveBeenNthCalledWith(3, {
        by: ["from_publisher_id"],
        where: { user: "user-1" },
        _count: { _all: true },
      });

      expect(elasticMock.search).not.toHaveBeenCalled();
      expect(res).toEqual({
        type: [{ key: "click", doc_count: 4 }],
        publisherTo: [{ key: "pub-to", doc_count: 2 }],
        publisherFrom: [{ key: "pub-from", doc_count: 1 }],
      });
    });
  });

  describe("updateIsBotForUser method", () => {
    it("updates isBot flag when no dual write", async () => {
      initFeatureFlags("es", "false");

      await statEventRepository.updateIsBotForUser("user-1", true);

      expect(elasticMock.updateByQuery).toHaveBeenCalledWith({
        index: expect.any(String),
        body: {
          query: { term: { user: "user-1" } },
          script: {
            lang: "painless",
            source: "ctx._source.isBot = params.isBot;",
            params: { isBot: true },
          },
        },
      });
      expect(pgMock.statEvent.updateMany).not.toHaveBeenCalled();
    });

    it("updates isBot flag when dual write", async () => {
      initFeatureFlags("es", "true");

      await statEventRepository.updateIsBotForUser("user-1", false);

      expect(elasticMock.updateByQuery).toHaveBeenCalledWith({
        index: expect.any(String),
        body: {
          query: { term: { user: "user-1" } },
          script: {
            lang: "painless",
            source: "ctx._source.isBot = params.isBot;",
            params: { isBot: false },
          },
        },
      });
      expect(pgMock.statEvent.updateMany).toHaveBeenCalledWith({
        where: { user: "user-1" },
        data: { is_bot: false },
      });
    });
  });
});

function initFeatureFlags(readFrom: "pg" | "es", dual = "false") {
  process.env.READ_STATS_FROM = readFrom;
  process.env.WRITE_STATS_DUAL = dual;
}
