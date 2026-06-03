import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMock = vi.hoisted(() => vi.fn());
const findMissionsByIdsMock = vi.hoisted(() => vi.fn());
const findOneMissionByMock = vi.hoisted(() => vi.fn());
const findRulesMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: { search: searchMock },
}));

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
    searchMock.mockReset();
    findMissionsByIdsMock.mockReset();
    findOneMissionByMock.mockReset();
    findRulesMock.mockReset();
    searchMock.mockResolvedValue({ hits: [], found: 0, facet_counts: [] });
    findMissionsByIdsMock.mockResolvedValue([]);
    findOneMissionByMock.mockResolvedValue(null);
    findRulesMock.mockResolvedValue([buildRule("annonceur-1"), buildRule("annonceur-2")]);
  });

  it("ne restreint pas la recherche quand aucune règle n'existe", async () => {
    findRulesMock.mockResolvedValue([]);

    await missionBrowseService.browse(baseParams);

    expect(findRulesMock).toHaveBeenCalledWith({ publisherId: "diffuseur-1" });
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: undefined }));
  });

  it("court-circuite quand des règles existent mais qu'aucune n'est supportée", async () => {
    findRulesMock.mockResolvedValue([buildRule("annonceur-1", { field: "publisherOrganizationId" })]);

    const result = await missionBrowseService.browse(baseParams);

    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("applique la whitelist des annonceurs autorisés", async () => {
    await missionBrowseService.browse(baseParams);

    expect(findRulesMock).toHaveBeenCalledWith({ publisherId: "diffuseur-1" });
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: "publisherId:=[`annonceur-1`,`annonceur-2`]" }));
  });

  it("combine le publisher demandé avec la whitelist sans faire confiance au paramètre", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-3" });

    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: "publisherId:=[`annonceur-1`,`annonceur-2`] && publisherId:=`annonceur-3`" }));
  });

  it("combine le publisher demandé quand il est dans la whitelist", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-2" });

    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: "publisherId:=[`annonceur-1`,`annonceur-2`] && publisherId:=`annonceur-2`" }));
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
