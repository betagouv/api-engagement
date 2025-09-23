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
});

function initFeatureFlags(readFrom: "pg" | "es", dual = "false") {
  process.env.READ_STATS_FROM = readFrom;
  process.env.WRITE_STATS_DUAL = dual;
}
