import { beforeEach, describe, expect, it, vi } from "vitest";
import { elasticMock, pgMock } from "../../mocks";
import { Stats } from "../../../src/types";

async function loadRepo(readFrom: string, dual = "false") {
  vi.resetModules();
  process.env.READ_STATS_FROM = readFrom;
  process.env.WRITE_STATS_DUAL = dual;
  return await import("../../../src/repositories/stat-event");
}

const baseEvent: Stats = {
  type: "click",
  createdAt: new Date(),
  origin: "", // required fields for toPg
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
    const repo = await loadRepo("pg");
    await repo.createStatEvent(baseEvent);
    expect(pgMock.statEvent.create).toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("dual writes when enabled", async () => {
    const repo = await loadRepo("es", "true");
    await repo.createStatEvent(baseEvent);
    expect(elasticMock.index).toHaveBeenCalled();
    expect(pgMock.statEvent.create).toHaveBeenCalled();
  });

  it("reads from elastic when configured", async () => {
    elasticMock.get.mockResolvedValueOnce({ body: { _source: { foo: "bar" }, _id: "1" } });
    const repo = await loadRepo("es");
    const res = await repo.getStatEventById("1");
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
    const repo = await loadRepo("pg");
    const res = await repo.getStatEventById("1");
    expect(pgMock.statEvent.findUnique).toHaveBeenCalled();
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(res?._id).toBe("1");
  });
});

