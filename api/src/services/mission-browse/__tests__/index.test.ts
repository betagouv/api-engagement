import { beforeEach, describe, expect, it, vi } from "vitest";

const multiSearchMock = vi.hoisted(() => vi.fn());
const findMissionsByIdsMock = vi.hoisted(() => vi.fn());
const findOneMissionByMock = vi.hoisted(() => vi.fn());
const findRulesMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: { multiSearch: multiSearchMock },
}));

// FACET_FIELDS = [...INDEXED_TAXONOMY_KEYS, "departmentCodes"]. Le service envoie 1 requête résultats
// (sans facet_by) + 1 requête par facette (avec facet_by), batchées en un seul appel multiSearch.
const FACET_FIELDS = ["domaine", "secteur_activite", "type_mission", "tranche_age", "dispositif", "departmentCodes"];
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

vi.mock("@/services/publisher-diffusion-rule", () => ({
  publisherDiffusionRuleService: { findRules: findRulesMock },
}));

import { missionBrowseService } from "@/services/mission-browse";

const baseParams = { page: 1, pageSize: 20, diffuseurPublisherId: "diffuseur-1" };
const buildRule = (value: string, overrides: Record<string, unknown> = {}) => ({
  id: `rule-${value}`,
  publisherId: "diffuseur-1",
  combinedWithId: null,
  field: "publisherId",
  fieldType: "string",
  operator: "is",
  value,
  combinator: "or",
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("missionBrowseService.browse", () => {
  beforeEach(() => {
    multiSearchMock.mockReset();
    findMissionsByIdsMock.mockReset();
    findOneMissionByMock.mockReset();
    findRulesMock.mockReset();
    multiSearchMock.mockResolvedValue(emptyMultiSearchResult());
    findMissionsByIdsMock.mockResolvedValue([]);
    findOneMissionByMock.mockResolvedValue(null);
    findRulesMock.mockResolvedValue([buildRule("annonceur-1"), buildRule("annonceur-2")]);
  });

  it("ne restreint pas la recherche quand aucune règle n'existe", async () => {
    findRulesMock.mockResolvedValue([]);

    await missionBrowseService.browse(baseParams);

    expect(findRulesMock).toHaveBeenCalledWith({ publisherId: "diffuseur-1" });
    expect(resultsSearch().filter_by).toBeUndefined();
  });

  it("court-circuite quand des règles existent mais qu'aucune n'est supportée", async () => {
    findRulesMock.mockResolvedValue([buildRule("annonceur-1", { field: "publisherOrganization.clientId" })]);

    const result = await missionBrowseService.browse(baseParams);

    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
    expect(multiSearchMock).not.toHaveBeenCalled();
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

  it("applique la whitelist des annonceurs autorisés", async () => {
    await missionBrowseService.browse(baseParams);

    expect(findRulesMock).toHaveBeenCalledWith({ publisherId: "diffuseur-1" });
    expect(resultsSearch().filter_by).toBe("publisherId:=[`annonceur-1`,`annonceur-2`]");
  });

  it("combine le publisher demandé avec la whitelist sans faire confiance au paramètre", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-3" });

    expect(resultsSearch().filter_by).toBe("publisherId:=[`annonceur-1`,`annonceur-2`] && publisherId:=`annonceur-3`");
  });

  it("combine le publisher demandé quand il est dans la whitelist", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-2" });

    expect(resultsSearch().filter_by).toBe("publisherId:=[`annonceur-1`,`annonceur-2`] && publisherId:=`annonceur-2`");
  });

  it("calcule chaque facette en excluant son propre groupe (facettes disjonctives)", async () => {
    await missionBrowseService.browse({
      ...baseParams,
      type_mission: ["benevolat", "volontariat"], // 2 valeurs du même groupe
      secteur_activite: ["sante"], // un autre groupe
    });

    const diffusion = "publisherId:=[`annonceur-1`,`annonceur-2`]";
    // Les parts suivent l'ordre de INDEXED_TAXONOMY_KEYS : secteur_activite avant type_mission.
    const allGroups = `${diffusion} && secteur_activite:=[\`sante\`] && type_mission:=[\`benevolat\`,\`volontariat\`]`;
    // La facette type_mission ignore SA sélection mais garde diffusion + l'autre groupe.
    expect(facetSearch("type_mission").filter_by).toBe(`${diffusion} && secteur_activite:=[\`sante\`]`);
    // La facette secteur_activite ignore SA sélection mais garde diffusion + type_mission.
    expect(facetSearch("secteur_activite").filter_by).toBe(`${diffusion} && type_mission:=[\`benevolat\`,\`volontariat\`]`);
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

  it("restreint le détail aux publishers whitelistés", async () => {
    await missionBrowseService.findById("mission-1", "diffuseur-1");

    expect(findOneMissionByMock).toHaveBeenCalledWith({
      id: "mission-1",
      publisherId: { in: ["annonceur-1", "annonceur-2"] },
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
  });

  it("restreint le détail avec les enfants organisation supportés", async () => {
    findRulesMock.mockResolvedValue([
      buildRule("annonceur-1", { id: "root-1" }),
      buildRule("po-1", { id: "child-1", combinedWithId: "root-1", field: "publisherOrganization.clientId" }),
    ]);

    await missionBrowseService.findById("mission-1", "diffuseur-1");

    expect(findOneMissionByMock).toHaveBeenCalledWith({
      id: "mission-1",
      AND: [{ publisherId: "annonceur-1" }, { publisherOrganization: { clientId: "po-1" } }],
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
  });

  it("ne restreint pas le détail quand aucune règle n'existe", async () => {
    findRulesMock.mockResolvedValue([]);

    await missionBrowseService.findById("mission-1", "diffuseur-1");

    expect(findOneMissionByMock).toHaveBeenCalledWith({
      id: "mission-1",
      deletedAt: null,
      statusCode: "ACCEPTED",
    });
  });
});
