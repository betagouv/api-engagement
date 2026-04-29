import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureMissionCollectionMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const documentsMock = vi.hoisted(() =>
  vi.fn((documentId?: string) => {
    if (documentId) {
      return { delete: deleteMock };
    }
    return {
      search: searchMock,
      upsert: upsertMock,
    };
  })
);

vi.mock("@/services/typesense/schema", () => ({
  ensureMissionCollection: ensureMissionCollectionMock,
}));

vi.mock("@/services/typesense/client", () => ({
  typesenseClient: {
    collections: vi.fn(() => ({
      documents: documentsMock,
    })),
  },
}));

import { missionTypesenseClient } from "@/services/typesense/mission-client";

describe("missionTypesenseClient", () => {
  beforeEach(() => {
    ensureMissionCollectionMock.mockReset();
    searchMock.mockReset();
    upsertMock.mockReset();
    deleteMock.mockReset();
    documentsMock.mockClear();
  });

  it("synchronise la collection avant une recherche", async () => {
    ensureMissionCollectionMock.mockResolvedValue(undefined);
    searchMock.mockResolvedValue({ found: 0, hits: [] });

    await missionTypesenseClient.search({ q: "*", query_by: "publisherId" });

    expect(ensureMissionCollectionMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledWith({ q: "*", query_by: "publisherId" });
  });

  it("synchronise la collection avant un upsert", async () => {
    const document = { id: "mission-1", publisherId: "publisher-1", departmentCodes: ["75"] };
    ensureMissionCollectionMock.mockResolvedValue(undefined);
    upsertMock.mockResolvedValue(document);

    await missionTypesenseClient.upsert(document);

    expect(ensureMissionCollectionMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(document);
  });

  it("synchronise la collection avant une suppression", async () => {
    ensureMissionCollectionMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue({ id: "mission-1" });

    await missionTypesenseClient.delete("mission-1");

    expect(ensureMissionCollectionMock).toHaveBeenCalledTimes(1);
    expect(documentsMock).toHaveBeenCalledWith("mission-1");
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
