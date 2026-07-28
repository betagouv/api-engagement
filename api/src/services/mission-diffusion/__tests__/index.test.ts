import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission", () => ({
  missionRepository: {
    findIds: vi.fn(),
    findIdsPage: vi.fn(),
  },
}));

vi.mock("@/repositories/mission-diffusion", () => ({
  missionDiffusionRepository: {
    findMissionIdsByDistributionPublisher: vi.fn(),
    findMissionIdsPageByDistributionPublisher: vi.fn(),
    findExistingMissionIdsForDistributionPublisher: vi.fn(),
    createManyForDistributionPublisher: vi.fn(),
    deleteManyForDistributionPublisher: vi.fn(),
  },
}));

vi.mock("@/services/publisher-diffusion-rule", () => {
  const service = {
    buildMissionDiffuseurSnapshotWhere: vi.fn(),
  };
  return { default: service, publisherDiffusionRuleService: service };
});

import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const missionRepositoryMock = missionRepository as unknown as {
  findIds: ReturnType<typeof vi.fn>;
  findIdsPage: ReturnType<typeof vi.fn>;
};
const missionDiffusionRepositoryMock = missionDiffusionRepository as unknown as {
  findMissionIdsByDistributionPublisher: ReturnType<typeof vi.fn>;
  findMissionIdsPageByDistributionPublisher: ReturnType<typeof vi.fn>;
  findExistingMissionIdsForDistributionPublisher: ReturnType<typeof vi.fn>;
  createManyForDistributionPublisher: ReturnType<typeof vi.fn>;
  deleteManyForDistributionPublisher: ReturnType<typeof vi.fn>;
};
const ruleServiceMock = publisherDiffusionRuleService as unknown as {
  buildMissionDiffuseurSnapshotWhere: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Par défaut, les compteurs des écritures reflètent le nombre d'ids passés.
  missionRepositoryMock.findIds.mockResolvedValue([]);
  missionRepositoryMock.findIdsPage.mockResolvedValue([]);
  missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue([]);
  missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue([]);
  missionDiffusionRepositoryMock.createManyForDistributionPublisher.mockImplementation(async (_distributionPublisherId: string, ids: string[]) => ids.length);
  missionDiffusionRepositoryMock.deleteManyForDistributionPublisher.mockImplementation(async (_distributionPublisherId: string, ids: string[]) => ids.length);
});

describe("missionDiffusionService.rebuildForDistributionPublisher", () => {
  it("insère uniquement les ids voulus absents et supprime les ids en trop (diff)", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m2", "m4"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m2"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m1", "m3"]);
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m4"]);
    expect(result).toMatchObject({ distributionPublisherId: "publisher-1", desired: 3, added: 2, removed: 1 });
  });

  it("supprime avant d'insérer (allowlist jamais transitoirement plus permissive)", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["a1"]); // ancien : annonceur A
    missionRepositoryMock.findIds.mockResolvedValue([]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["b1"]); // nouveau : annonceur B autorisé
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue([]);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    const deleteOrder = missionDiffusionRepositoryMock.deleteManyForDistributionPublisher.mock.invocationCallOrder[0];
    const createOrder = missionDiffusionRepositoryMock.createManyForDistributionPublisher.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("utilise les lectures paginées plutôt que les ensembles complets", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue([]);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher).toHaveBeenCalledWith("publisher-1", { afterMissionId: undefined, take: 5000 });
    expect(missionRepositoryMock.findIdsPage).toHaveBeenCalledWith({ AND: [{ publisherId: "annonceur-1" }, { deletedAt: null }] }, { afterId: undefined, take: 5000 });
    expect(missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand il n'y a rien à écrire", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m1"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m1"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m1"]);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).not.toHaveBeenCalled();
  });

  it("est idempotent : n'écrit rien quand l'ensemble voulu est déjà en table", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m1", "m2"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1", "m2"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ added: 0, removed: 0 });
  });

  it("matérialise le scope propre quand le publisher de diffusion n'a pas d'allowlist", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "publisher-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue([]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m-own"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m-own"]);
    expect(result).toMatchObject({ desired: 1, added: 1, removed: 0 });
  });

  it("purge les lignes existantes qui ne figurent plus dans le snapshot", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "publisher-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m1", "m2"]);
    expect(result).toMatchObject({ removed: 2 });
  });

  it("découpe les insertions en lots (WRITE_BATCH_SIZE)", async () => {
    const ids = Array.from({ length: 5001 }, (_, index) => `m-${index}`);
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue([]);
    missionRepositoryMock.findIdsPage.mockResolvedValueOnce(ids.slice(0, 5000)).mockResolvedValueOnce(ids.slice(5000));
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue([]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionRepositoryMock.findIdsPage).toHaveBeenNthCalledWith(1, { AND: [{ publisherId: "annonceur-1" }, { deletedAt: null }] }, { afterId: undefined, take: 5000 });
    expect(missionRepositoryMock.findIdsPage).toHaveBeenNthCalledWith(2, { AND: [{ publisherId: "annonceur-1" }, { deletedAt: null }] }, { afterId: "m-4999", take: 5000 });
    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(5001);
  });

  it("calcule le delta sans écrire en dry-run", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m2", "m4"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m2"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1", { dryRun: true });

    expect(result).toMatchObject({ distributionPublisherId: "publisher-1", desired: 3, added: 2, removed: 1, dryRun: true });
    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).not.toHaveBeenCalled();
  });

  it("signale via onMissionsTouched les missions retirées puis ajoutées", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m2", "m4"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m2"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m2"]);
    const onMissionsTouched = vi.fn().mockResolvedValue(undefined);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1", { onMissionsTouched });

    // Suppressions avant insertions : m4 retirée, puis m1/m3 ajoutées.
    expect(onMissionsTouched).toHaveBeenNthCalledWith(1, ["m4"]);
    expect(onMissionsTouched).toHaveBeenNthCalledWith(2, ["m1", "m3"]);
  });

  it("n'appelle pas onMissionsTouched en dry-run", async () => {
    ruleServiceMock.buildMissionDiffuseurSnapshotWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionDiffusionRepositoryMock.findMissionIdsPageByDistributionPublisher.mockResolvedValue(["m2", "m4"]);
    missionRepositoryMock.findIds.mockResolvedValue(["m2"]);
    missionRepositoryMock.findIdsPage.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findExistingMissionIdsForDistributionPublisher.mockResolvedValue(["m2"]);
    const onMissionsTouched = vi.fn().mockResolvedValue(undefined);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1", { dryRun: true, onMissionsTouched });

    expect(onMissionsTouched).not.toHaveBeenCalled();
  });
});
