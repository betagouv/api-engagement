import { beforeEach, describe, expect, it, vi } from "vitest";

const performMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/providers/typesense/client", () => ({
  typesenseClient: {
    multiSearch: { perform: performMock },
  },
}));

import { TypesenseSearchProvider } from "@/services/search/providers/typesense";

describe("TypesenseSearchProvider.search", () => {
  const provider = new TypesenseSearchProvider();

  beforeEach(() => {
    performMock.mockReset();
  });

  it("passe par multi_search (POST) pour éviter la limite de 4000 caractères du GET", async () => {
    const response = { found: 2, hits: [{ document: { id: "m1" } }] };
    performMock.mockResolvedValue({ results: [response] });

    const params = { q: "*", query_by: "publisherId", filter_by: "publisherId:=`pub-1`", page: 1 };
    const result = await provider.search("missions", params);

    expect(performMock).toHaveBeenCalledWith({
      searches: [{ collection: "missions", ...params }],
    });
    expect(result).toBe(response);
  });

  it("propage l'erreur d'une sous-recherche multi_search", async () => {
    performMock.mockResolvedValue({ results: [{ code: 400, error: "Bad filter_by" }] });

    await expect(provider.search("missions", { q: "*" })).rejects.toThrow("Bad filter_by");
  });

  it("batche plusieurs sous-recherches en un seul appel multi_search", async () => {
    const r1 = { found: 5, hits: [] };
    const r2 = { found: 0, hits: [], facet_counts: [{ field_name: "domaine", counts: [] }] };
    performMock.mockResolvedValue({ results: [r1, r2] });

    const searches = [
      { q: "*", query_by: "publisherId", filter_by: "publisherId:=`pub-1`" },
      { q: "*", query_by: "publisherId", facet_by: "domaine", per_page: 0 },
    ];
    const results = await provider.multiSearch("missions", searches);

    expect(performMock).toHaveBeenCalledTimes(1);
    expect(performMock).toHaveBeenCalledWith({
      searches: searches.map((params) => ({ collection: "missions", ...params })),
    });
    expect(results).toEqual([r1, r2]);
  });
});
