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

  it("writes to postgres when reading from pg", async () => {
    initFeatureFlags("pg");

    await statEventRepository.createStatEvent(baseEvent as Stats);
    expect(pgMock.statEvent.create).toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("dual writes when enabled", async () => {
    initFeatureFlags("es", "true");
    await statEventRepository.createStatEvent(baseEvent as Stats);
    expect(elasticMock.index).toHaveBeenCalled();
    expect(pgMock.statEvent.create).toHaveBeenCalled();
  });

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
      }),
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

  it("does not override unspecified fields during pg updates", async () => {
    initFeatureFlags("pg");

    await statEventRepository.updateStatEventById("event-id", { status: "VALIDATED" });

    expect(pgMock.statEvent.update).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { status: "VALIDATED" },
    });
    expect(elasticMock.update).not.toHaveBeenCalled();
  });

  it("updates only provided fields in pg when dual writing from es", async () => {
    initFeatureFlags("es", "true");
    const patch: Partial<Stats> = { sourceName: "updated", isHuman: false };

    await statEventRepository.updateStatEventById("event-id", patch);

    expect(elasticMock.update).toHaveBeenCalledWith({
      index: expect.any(String),
      id: "event-id",
      body: { doc: patch },
    });
    expect(pgMock.statEvent.update).toHaveBeenCalledWith({
      where: { id: "event-id" },
      data: { source_name: "updated", is_human: false },
    });
  });

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
              must_not: expect.arrayContaining([
                { term: { "toPublisherName.keyword": "Service Civique" } },
              ]),
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
      excludeUsers: ["bot"]
    });

    expect(pgMock.statEvent.count).toHaveBeenCalledTimes(8);
    expect(pgMock.statEvent.count).toHaveBeenCalledWith({
      where: {
        created_at: { gte: expect.any(Date), lt: expect.any(Date) },
        type: "click",
        AND: [
          { to_publisher_name: "Service Civique" },
          { NOT: { user: { in: ["bot"] } } },
        ],
      },
    });
    expect(pgMock.statEvent.count).toHaveBeenCalledWith({
      where: {
        created_at: { gte: expect.any(Date), lt: expect.any(Date) },
        type: "click",
        AND: [
          { to_publisher_name: "Service Civique" },
          { NOT: { user: { in: ["bot"] } } },
        ],
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

function initFeatureFlags(readFrom: "pg" | "es", dual = "false") {
  process.env.READ_STATS_FROM = readFrom;
  process.env.WRITE_STATS_DUAL = dual;
}
