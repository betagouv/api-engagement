import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission", () => ({
  missionRepository: {
    findIds: vi.fn(),
  },
}));

vi.mock("@/repositories/mission-diffusion", () => ({
  missionDiffusionRepository: {
    findMissionIdsByDiffuser: vi.fn(),
    createManyForDiffuser: vi.fn(),
    deleteManyForDiffuser: vi.fn(),
    deleteRowsForDiffusersNotIn: vi.fn(),
  },
}));

vi.mock("@/services/publisher-diffusion-rule", () => {
  const service = {
    buildMissionDiffuseurAllowlistWhere: vi.fn(),
    findDiffuserPublisherIdsWithAllowlist: vi.fn(),
  };
  return { default: service, publisherDiffusionRuleService: service };
});

import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const missionRepositoryMock = missionRepository as unknown as { findIds: ReturnType<typeof vi.fn> };
const missionDiffusionRepositoryMock = missionDiffusionRepository as unknown as {
  findMissionIdsByDiffuser: ReturnType<typeof vi.fn>;
  createManyForDiffuser: ReturnType<typeof vi.fn>;
  deleteManyForDiffuser: ReturnType<typeof vi.fn>;
  deleteRowsForDiffusersNotIn: ReturnType<typeof vi.fn>;
};
const ruleServiceMock = publisherDiffusionRuleService as unknown as {
  buildMissionDiffuseurAllowlistWhere: ReturnType<typeof vi.fn>;
  findDiffuserPublisherIdsWithAllowlist: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Par défaut, les compteurs des écritures reflètent le nombre d'ids passés.
  missionDiffusionRepositoryMock.createManyForDiffuser.mockImplementation(async (_diffuserId: string, ids: string[]) => ids.length);
  missionDiffusionRepositoryMock.deleteManyForDiffuser.mockImplementation(async (_diffuserId: string, ids: string[]) => ids.length);
  missionDiffusionRepositoryMock.deleteRowsForDiffusersNotIn.mockResolvedValue(0);
});

describe("missionDiffusionService.rebuildForDiffuser", () => {
  it("insère uniquement les ids voulus absents et supprime les ids en trop (diff)", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue(["m2", "m4"]);

    const result = await missionDiffusionService.rebuildForDiffuser("diffuseur-1");

    expect(missionDiffusionRepositoryMock.createManyForDiffuser).toHaveBeenCalledWith("diffuseur-1", ["m1", "m3"]);
    expect(missionDiffusionRepositoryMock.deleteManyForDiffuser).toHaveBeenCalledWith("diffuseur-1", ["m4"]);
    expect(result).toMatchObject({ diffuserPublisherId: "diffuseur-1", desired: 3, added: 2, removed: 1 });
  });

  it("est idempotent : n'écrit rien quand l'ensemble voulu est déjà en table", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2"]);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDiffuser("diffuseur-1");

    expect(missionDiffusionRepositoryMock.createManyForDiffuser).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDiffuser).not.toHaveBeenCalled();
    expect(result).toMatchObject({ added: 0, removed: 0 });
  });

  it("ne matérialise rien quand le diffuseur n'a pas d'allowlist (where null), sans interroger les missions", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue(null);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue([]);

    const result = await missionDiffusionService.rebuildForDiffuser("diffuseur-1");

    expect(missionRepositoryMock.findIds).not.toHaveBeenCalled();
    expect(result).toMatchObject({ desired: 0, added: 0, removed: 0 });
  });

  it("purge les lignes existantes quand l'allowlist ne renvoie plus aucune mission", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue(null);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDiffuser("diffuseur-1");

    expect(missionDiffusionRepositoryMock.deleteManyForDiffuser).toHaveBeenCalledWith("diffuseur-1", ["m1", "m2"]);
    expect(result).toMatchObject({ removed: 2 });
  });

  it("découpe les insertions en lots (WRITE_BATCH_SIZE)", async () => {
    const ids = Array.from({ length: 5001 }, (_, index) => `m-${index}`);
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(ids);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue([]);

    const result = await missionDiffusionService.rebuildForDiffuser("diffuseur-1");

    expect(missionDiffusionRepositoryMock.createManyForDiffuser).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(5001);
  });
});

describe("missionDiffusionService.rebuildAll", () => {
  it("rebuild chaque diffuseur à allowlist puis purge les diffuseurs retirés, et agrège les compteurs", async () => {
    ruleServiceMock.findDiffuserPublisherIdsWithAllowlist.mockResolvedValue(["d1", "d2"]);
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur" });
    missionRepositoryMock.findIds.mockImplementation(async () => ["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsByDiffuser.mockResolvedValue([]);
    missionDiffusionRepositoryMock.deleteRowsForDiffusersNotIn.mockResolvedValue(3);

    const result = await missionDiffusionService.rebuildAll();

    expect(missionDiffusionRepositoryMock.deleteRowsForDiffusersNotIn).toHaveBeenCalledWith(["d1", "d2"]);
    expect(result.diffusers).toBe(2);
    expect(result.added).toBe(2); // 1 par diffuseur
    expect(result.prunedDiffusers).toBe(3);
    expect(result.removed).toBe(3); // 0 diff par diffuseur + 3 purgées
    expect(result.perDiffuser).toHaveLength(2);
  });
});
