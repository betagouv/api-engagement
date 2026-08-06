import { beforeEach, describe, expect, it, vi } from "vitest";

import { MISSION_BROWSE_FACET_FIELDS } from "@/services/search/collections/missions/fields";

const multiSearchMock = vi.hoisted(() => vi.fn());
const findMissionsByIdsMock = vi.hoisted(() => vi.fn());
const findOneMissionByMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: { multiSearch: multiSearchMock },
}));

// Le service envoie 1 requête résultats
// (sans facet_by) + 1 requête par facette (avec facet_by), batchées en un seul appel multiSearch.
const FACET_FIELDS = [...MISSION_BROWSE_FACET_FIELDS];
// Réponse multiSearch par défaut : résultats vides + une réponse vide par facette.
type FacetResponse = { hits: never[]; found: number; facet_counts?: Array<{ field_name: string; counts: Array<{ value: string; count: number }> }> };
const emptyMultiSearchResult = (): FacetResponse[] => [
  { hits: [], found: 0 },
  ...FACET_FIELDS.map((field) => ({ hits: [] as never[], found: 0, facet_counts: [{ field_name: field, counts: [] }] })),
];
// Récupère le tableau de sous-requêtes passé au dernier appel multiSearch.
const lastSearches = () => {
  const calls = multiSearchMock.mock.calls;
  return calls[calls.length - 1]?.[0] as Array<Record<string, unknown>>;
};
const resultsSearch = () => lastSearches()[0];
const facetSearch = (field: string) => lastSearches().find((s) => s.facet_by === field)!;

vi.mock("@/services/mission", () => ({
  missionService: { findMissionsByIds: findMissionsByIdsMock, findOneMissionBy: findOneMissionByMock },
}));

import { MissionBrowseIndexUnavailableError, missionBrowseService } from "@/services/mission-browse";

const baseParams = { page: 1, pageSize: 20, diffuseurPublisherId: "diffuseur-1" };
// Filtre de diffusion attendu : le snapshot `mission_diffusion` dénormalisé dans le document Typesense.
const DIFFUSION = "distributionPublisherIds:=`diffuseur-1`";

describe("missionBrowseService.browse", () => {
  beforeEach(() => {
    multiSearchMock.mockReset();
    findMissionsByIdsMock.mockReset();
    findOneMissionByMock.mockReset();
    multiSearchMock.mockResolvedValue(emptyMultiSearchResult());
    findMissionsByIdsMock.mockResolvedValue([]);
    findOneMissionByMock.mockResolvedValue(null);
  });

  it("applique systématiquement le filtre de diffusion issu du snapshot", async () => {
    await missionBrowseService.browse(baseParams);

    expect(resultsSearch().filter_by).toBe(DIFFUSION);
  });

  it("envoie une requête résultats + une requête par facette en un seul multi_search", async () => {
    await missionBrowseService.browse(baseParams);

    expect(multiSearchMock).toHaveBeenCalledTimes(1);
    const searches = lastSearches();
    expect(searches).toHaveLength(1 + FACET_FIELDS.length);
    // La requête résultats n'a pas de facet_by ; chaque facette a le sien.
    expect(searches[0].facet_by).toBeUndefined();
    expect(searches.slice(1).map((s) => s.facet_by)).toEqual(FACET_FIELDS);
  });

  it("applique le filtre de diffusion à toutes les facettes", async () => {
    await missionBrowseService.browse(baseParams);

    for (const field of FACET_FIELDS) {
      expect(facetSearch(field).filter_by).toBe(DIFFUSION);
    }
  });

  it("demande assez de valeurs pour la facette des départements", async () => {
    await missionBrowseService.browse(baseParams);

    expect(facetSearch("departmentCodes").max_facet_values).toBe(120);
    expect(facetSearch("domaine").max_facet_values).toBe(100);
  });

  it("combine le publisher demandé avec le filtre de diffusion sans faire confiance au paramètre", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-3" });

    expect(resultsSearch().filter_by).toBe(`${DIFFUSION} && publisherId:=\`annonceur-3\``);
  });

  it("calcule chaque facette en excluant son propre groupe (facettes disjonctives)", async () => {
    await missionBrowseService.browse({
      ...baseParams,
      type_mission: ["benevolat", "volontariat"], // 2 valeurs du même groupe
      secteur_activite: ["sante"], // un autre groupe
    });

    // Les parts suivent l'ordre de INDEXED_TAXONOMY_KEYS : secteur_activite avant type_mission.
    const allGroups = `${DIFFUSION} && secteur_activite:=[\`sante\`] && type_mission:=[\`benevolat\`,\`volontariat\`]`;
    // La facette type_mission ignore SA sélection mais garde diffusion + l'autre groupe.
    expect(facetSearch("type_mission").filter_by).toBe(`${DIFFUSION} && secteur_activite:=[\`sante\`]`);
    // La facette secteur_activite ignore SA sélection mais garde diffusion + type_mission.
    expect(facetSearch("secteur_activite").filter_by).toBe(`${DIFFUSION} && type_mission:=[\`benevolat\`,\`volontariat\`]`);
    // Une facette d'un groupe non sélectionné garde tous les filtres.
    expect(facetSearch("domaine").filter_by).toBe(allGroups);
    // La requête résultats applique tous les filtres.
    expect(resultsSearch().filter_by).toBe(allGroups);
  });

  it("mappe les compteurs de chaque facette depuis sa sous-requête dédiée", async () => {
    const result = emptyMultiSearchResult();
    // index 0 = résultats, puis FACET_FIELDS dans l'ordre → type_mission est en 3e position de facette.
    const typeMissionIndex = 1 + FACET_FIELDS.indexOf("type_mission");
    result[typeMissionIndex] = { hits: [], found: 0, facet_counts: [{ field_name: "type_mission", counts: [{ value: "benevolat", count: 42 }] }] };
    multiSearchMock.mockResolvedValue(result);

    const { facets } = await missionBrowseService.browse(baseParams);

    expect(facets.type_mission).toEqual([{ key: "benevolat", count: 42 }]);
    expect(facets.domaine).toEqual([]);
  });

  it("utilise la recherche, le tri et les facettes du widget sans modifier le mode intégrateur", async () => {
    multiSearchMock.mockResolvedValue([
      { hits: [], found: 0 },
      { hits: [], found: 0, facet_counts: [{ field_name: "mission_domain", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "publisherOrganizationFacet", counts: [{ value: "org-1|||Organisation 1", count: 3 }] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "departmentNames", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "remote", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "countryCodes", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "schedule", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "tasks", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "audience", counts: [] }] },
      { hits: [], found: 0, facet_counts: [{ field_name: "openToMinors", counts: [{ value: "true", count: 2 }] }] },
      {
        hits: [],
        found: 0,
        facet_counts: [
          { field_name: "reducedMobilityAccessible", counts: [{ value: "true", count: 1 }] },
          { field_name: "closeToTransport", counts: [{ value: "true", count: 4 }] },
        ],
      },
    ]);

    const result = await missionBrowseService.browse({
      ...baseParams,
      widgetMode: true,
      baseFilterBy: "publisherId:=`publisher-1`",
      search: "solidarité",
    });

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

  it("utilise l'offset du widget sans l'arrondir à une page Typesense", async () => {
    await missionBrowseService.browse({
      ...baseParams,
      widgetMode: true,
      baseFilterBy: "publisherId:=`publisher-1`",
      offset: 10,
      pageSize: 25,
    });

    expect(resultsSearch()).toMatchObject({ offset: 10, limit: 25 });
    expect(resultsSearch().page).toBeUndefined();
    expect(resultsSearch().per_page).toBeUndefined();
  });

  it("conserve les missions locales hors rayon dans une recherche géolocalisée", async () => {
    await missionBrowseService.browse({
      ...baseParams,
      widgetMode: true,
      baseFilterBy: "publisherId:=`publisher-1`",
      lat: 48.8566,
      lon: 2.3522,
      distanceKm: 50,
      remote: ["no", "local"],
    });

    expect(resultsSearch().filter_by).toContain("(locations:(48.8566,2.3522,50 km) || remote:=`local`)");
    expect(resultsSearch().sort_by).toBe("startAt:desc,createdAt:desc");
  });

  it("impose le rayon quand le filtre remote exclut les missions locales", async () => {
    await missionBrowseService.browse({
      ...baseParams,
      widgetMode: true,
      baseFilterBy: "publisherId:=`publisher-1`",
      lat: 48.8566,
      lon: 2.3522,
      distanceKm: 50,
      remote: ["full", "possible"],
    });

    expect(resultsSearch().filter_by).toContain("locations:(48.8566,2.3522,50 km)");
    expect(resultsSearch().filter_by).not.toContain("|| remote:=`local`");
  });

  it("expose une erreur métier lorsque Typesense est indisponible", async () => {
    multiSearchMock.mockRejectedValue(new Error("Typesense unavailable"));

    await expect(missionBrowseService.browse(baseParams)).rejects.toBeInstanceOf(MissionBrowseIndexUnavailableError);
  });

  it("restreint le détail au snapshot matérialisé du diffuseur", async () => {
    await missionBrowseService.findById("mission-1", "diffuseur-1");

    expect(findOneMissionByMock).toHaveBeenCalledWith({
      id: "mission-1",
      missionDiffusions: { some: { distributionPublisherId: "diffuseur-1" } },
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
  });
});
