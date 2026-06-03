import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMock = vi.hoisted(() => vi.fn());
const findMissionsByIdsMock = vi.hoisted(() => vi.fn());
const findOneMissionByMock = vi.hoisted(() => vi.fn());
const findAllowedPublisherIdsMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/search/collections/missions/client", () => ({
  missionSearchClient: { search: searchMock },
}));

vi.mock("@/services/mission", () => ({
  missionService: { findMissionsByIds: findMissionsByIdsMock, findOneMissionBy: findOneMissionByMock },
}));

vi.mock("@/services/publisher-diffusion-rule", () => ({
  publisherDiffusionRuleService: { findAllowedMissionPublisherIds: findAllowedPublisherIdsMock },
}));

import { missionBrowseService } from "@/services/mission-browse";

const baseParams = { page: 1, pageSize: 20, diffuseurPublisherId: "diffuseur-1" };

describe("missionBrowseService.browse", () => {
  beforeEach(() => {
    searchMock.mockReset();
    findMissionsByIdsMock.mockReset();
    findOneMissionByMock.mockReset();
    findAllowedPublisherIdsMock.mockReset();
    searchMock.mockResolvedValue({ hits: [], found: 0, facet_counts: [] });
    findMissionsByIdsMock.mockResolvedValue([]);
    findOneMissionByMock.mockResolvedValue(null);
    findAllowedPublisherIdsMock.mockResolvedValue(["annonceur-1", "annonceur-2"]);
  });

  it("court-circuite (réponse vide, pas d'appel index) quand aucune règle whitelist n'existe", async () => {
    findAllowedPublisherIdsMock.mockResolvedValue([]);

    const result = await missionBrowseService.browse(baseParams);

    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
    expect(searchMock).not.toHaveBeenCalled();
    expect(findAllowedPublisherIdsMock).toHaveBeenCalledWith("diffuseur-1");
  });

  it("applique la whitelist des annonceurs autorisés", async () => {
    await missionBrowseService.browse(baseParams);

    expect(findAllowedPublisherIdsMock).toHaveBeenCalledWith("diffuseur-1");
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: "publisherId:=[`annonceur-1`,`annonceur-2`]" }));
  });

  it("court-circuite quand le publisher demandé est hors whitelist", async () => {
    const result = await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-3" });

    expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("restreint au publisher demandé quand il est dans la whitelist", async () => {
    await missionBrowseService.browse({ ...baseParams, publisherId: "annonceur-2" });

    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ filter_by: "publisherId:=`annonceur-2`" }));
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
});
