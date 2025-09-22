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
});

function initFeatureFlags(readFrom: "pg" | "es", dual = "false") {
  process.env.READ_STATS_FROM = readFrom;
  process.env.WRITE_STATS_DUAL = dual;
}
