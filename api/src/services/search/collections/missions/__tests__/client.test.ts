import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/index", () => ({
  searchProvider: {
    search: searchMock,
    upsert: upsertMock,
    delete: deleteMock,
  },
}));

import { missionSearchClient } from "@/services/search/collections/missions/client";

describe("missionSearchClient", () => {
  beforeEach(() => {
    searchMock.mockReset();
    upsertMock.mockReset();
    deleteMock.mockReset();
  });

  it("délègue la recherche au provider avec le bon nom de collection", async () => {
    searchMock.mockResolvedValue({ found: 0, hits: [] });

    await missionSearchClient.search({ q: "*", query_by: "publisherId" });

    expect(searchMock).toHaveBeenCalledWith(expect.any(String), { q: "*", query_by: "publisherId" });
  });

  it("délègue l'upsert au provider avec le bon nom de collection", async () => {
    const document = { id: "mission-1", publisherId: "publisher-1", departmentCodes: ["75"] };
    upsertMock.mockResolvedValue(document);

    await missionSearchClient.upsert(document);

    expect(upsertMock).toHaveBeenCalledWith(expect.any(String), document);
  });

  it("délègue la suppression au provider avec le bon nom de collection", async () => {
    deleteMock.mockResolvedValue({ id: "mission-1" });

    await missionSearchClient.delete("mission-1");

    expect(deleteMock).toHaveBeenCalledWith(expect.any(String), "mission-1");
  });
});
