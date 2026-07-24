import { beforeEach, describe, expect, it, vi } from "vitest";

const multiSearchMock = vi.hoisted(() => vi.fn());
const findMissionsByIdsMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: { multiSearch: multiSearchMock },
}));

vi.mock("@/services/mission", () => ({
  missionService: { findMissionsByIds: findMissionsByIdsMock },
}));

import { IframeBrowseIndexUnavailableError, iframeBrowseService } from "@/services/iframe-browse";

const emptyResults = () => [
  { hits: [], found: 0 },
  { hits: [], found: 0, facet_counts: [{ field_name: "mission_domain", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "publisherOrganizationFacet", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "departmentNames", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "remote", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "countryCodes", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "schedule", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "tasks", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "audience", counts: [] }] },
  { hits: [], found: 0, facet_counts: [{ field_name: "openToMinors", counts: [] }] },
  {
    hits: [],
    found: 0,
    facet_counts: [
      { field_name: "reducedMobilityAccessible", counts: [] },
      { field_name: "closeToTransport", counts: [] },
    ],
  },
];
const baseParams = { baseFilterBy: "publisherId:=`publisher-1`", page: 1, pageSize: 20 };
const searches = () => multiSearchMock.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
const resultsSearch = () => searches()[0];

describe("iframeBrowseService.browse", () => {
  beforeEach(() => {
    multiSearchMock.mockReset();
    findMissionsByIdsMock.mockReset();
    multiSearchMock.mockResolvedValue(emptyResults());
    findMissionsByIdsMock.mockResolvedValue([]);
  });

  it("utilise la recherche, le tri et les facettes du widget", async () => {
    const results = emptyResults();
    results[1] = { hits: [], found: 0, facet_counts: [{ field_name: "mission_domain", counts: [] }] };
    results[2] = {
      hits: [],
      found: 0,
      facet_counts: [{ field_name: "publisherOrganizationFacet", counts: [{ value: "org-1|||Organisation 1", count: 3 }] }],
    };
    results[9] = { hits: [], found: 0, facet_counts: [{ field_name: "openToMinors", counts: [{ value: "true", count: 2 }] }] };
    results[10] = {
      hits: [],
      found: 0,
      facet_counts: [
        { field_name: "reducedMobilityAccessible", counts: [{ value: "true", count: 1 }] },
        { field_name: "closeToTransport", counts: [{ value: "true", count: 4 }] },
      ],
    };
    multiSearchMock.mockResolvedValue(results);

    const result = await iframeBrowseService.browse({ ...baseParams, search: "solidarité" });

    expect(resultsSearch()).toMatchObject({
      q: "solidarité",
      query_by: "title,publisherOrganizationFacet,cityNames,mission_domain",
      sort_by: "startAt:desc,createdAt:desc",
      filter_by: "publisherId:=`publisher-1`",
    });
    expect(result.facets.organization).toEqual([{ key: "org-1", label: "Organisation 1", count: 3 }]);
    expect(result.facets.minor).toEqual([{ key: "yes", count: 2 }]);
    expect(result.facets.accessibility).toEqual([
      { key: "reducedMobilityAccessible", count: 1 },
      { key: "closeToTransport", count: 4 },
    ]);
  });

  it("conserve les missions locales hors rayon dans une recherche géolocalisée", async () => {
    await iframeBrowseService.browse({
      ...baseParams,
      lat: 48.8566,
      lon: 2.3522,
      distanceKm: 50,
      remote: ["no", "local"],
    });

    expect(resultsSearch().filter_by).toContain("(locations:(48.8566,2.3522,50 km) || remote:=`local`)");
  });

  it("impose le rayon quand le filtre remote exclut les missions locales", async () => {
    await iframeBrowseService.browse({
      ...baseParams,
      lat: 48.8566,
      lon: 2.3522,
      distanceKm: 50,
      remote: ["full", "possible"],
    });

    expect(resultsSearch().filter_by).toContain("locations:(48.8566,2.3522,50 km)");
    expect(resultsSearch().filter_by).not.toContain("|| remote:=`local`");
  });

  it("retourne une réponse vide quand le widget n'a aucune éligibilité", async () => {
    await expect(iframeBrowseService.browse({ ...baseParams, baseFilterBy: null })).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      facets: {},
    });
    expect(multiSearchMock).not.toHaveBeenCalled();
  });

  it("expose une erreur métier lorsque Typesense est indisponible", async () => {
    multiSearchMock.mockRejectedValue(new Error("Typesense unavailable"));

    await expect(iframeBrowseService.browse(baseParams)).rejects.toBeInstanceOf(IframeBrowseIndexUnavailableError);
  });
});
