import { beforeEach, describe, expect, it, vi } from "vitest";

const pgClientMock = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
}));

vi.mock("pg", () => ({
  Client: vi.fn(function Client() {
    return pgClientMock;
  }),
}));

vi.mock("@/repositories/mission", () => ({
  missionRepository: {
    findIds: vi.fn(),
  },
}));

vi.mock("@/repositories/mission-diffusion", () => ({
  missionDiffusionRepository: {
    findMissionIdsByDistributionPublisher: vi.fn(),
    createManyForDistributionPublisher: vi.fn(),
    deleteManyForDistributionPublisher: vi.fn(),
    deleteRowsForDistributionPublishersNotIn: vi.fn(),
    countRowsForDistributionPublishersNotIn: vi.fn(),
  },
}));

vi.mock("@/services/publisher-diffusion-rule", () => {
  const service = {
    buildMissionDiffuseurAllowlistWhere: vi.fn(),
    findDistributionPublisherIdsWithAllowlist: vi.fn(),
  };
  return { default: service, publisherDiffusionRuleService: service };
});

import { prisma } from "@/db/postgres";
import { missionRepository } from "@/repositories/mission";
import { missionDiffusionRepository } from "@/repositories/mission-diffusion";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const prismaMock = prisma as unknown as { $transaction: ReturnType<typeof vi.fn> };
const missionRepositoryMock = missionRepository as unknown as { findIds: ReturnType<typeof vi.fn> };
const missionDiffusionRepositoryMock = missionDiffusionRepository as unknown as {
  findMissionIdsByDistributionPublisher: ReturnType<typeof vi.fn>;
  createManyForDistributionPublisher: ReturnType<typeof vi.fn>;
  deleteManyForDistributionPublisher: ReturnType<typeof vi.fn>;
  deleteRowsForDistributionPublishersNotIn: ReturnType<typeof vi.fn>;
  countRowsForDistributionPublishersNotIn: ReturnType<typeof vi.fn>;
};
const ruleServiceMock = publisherDiffusionRuleService as unknown as {
  buildMissionDiffuseurAllowlistWhere: ReturnType<typeof vi.fn>;
  findDistributionPublisherIdsWithAllowlist: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  pgClientMock.connect.mockResolvedValue(undefined);
  pgClientMock.end.mockResolvedValue(undefined);
  pgClientMock.query.mockImplementation(async (sql: string) => {
    if (sql.includes("pg_try_advisory_lock")) {
      return { rows: [{ locked: true }] };
    }
    if (sql.includes("pg_advisory_unlock")) {
      return { rows: [{ unlocked: true }] };
    }
    return { rows: [] };
  });
  // Exécute le callback de transaction avec un client factice (repos mockés → sa valeur importe peu).
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  // Par défaut, les compteurs des écritures reflètent le nombre d'ids passés.
  missionDiffusionRepositoryMock.createManyForDistributionPublisher.mockImplementation(async (_distributionPublisherId: string, ids: string[]) => ids.length);
  missionDiffusionRepositoryMock.deleteManyForDistributionPublisher.mockImplementation(async (_distributionPublisherId: string, ids: string[]) => ids.length);
  missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(0);
  missionDiffusionRepositoryMock.countRowsForDistributionPublishersNotIn.mockResolvedValue(0);
});

describe("missionDiffusionService.rebuildForDistributionPublisher", () => {
  it("insère uniquement les ids voulus absents et supprime les ids en trop (diff)", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["m2", "m4"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m1", "m3"], expect.anything());
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m4"], expect.anything());
    expect(result).toMatchObject({ distributionPublisherId: "publisher-1", desired: 3, added: 2, removed: 1 });
  });

  it("supprime avant d'insérer (allowlist jamais transitoirement plus permissive)", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["b1"]); // nouveau : annonceur B autorisé
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["a1"]); // ancien : annonceur A

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    const deleteOrder = missionDiffusionRepositoryMock.deleteManyForDistributionPublisher.mock.invocationCallOrder[0];
    const createOrder = missionDiffusionRepositoryMock.createManyForDistributionPublisher.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("applique le delta dans une transaction", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue([]);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("n'ouvre pas de transaction quand il n'y a rien à écrire", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["m1"]);

    await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("est idempotent : n'écrit rien quand l'ensemble voulu est déjà en table", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ added: 0, removed: 0 });
  });

  it("ne matérialise rien quand le publisher de diffusion n'a pas d'allowlist (where null), sans interroger les missions", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue(null);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue([]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionRepositoryMock.findIds).not.toHaveBeenCalled();
    expect(result).toMatchObject({ desired: 0, added: 0, removed: 0 });
  });

  it("purge les lignes existantes quand l'allowlist ne renvoie plus aucune mission", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue(null);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["m1", "m2"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).toHaveBeenCalledWith("publisher-1", ["m1", "m2"], expect.anything());
    expect(result).toMatchObject({ removed: 2 });
  });

  it("découpe les insertions en lots (WRITE_BATCH_SIZE)", async () => {
    const ids = Array.from({ length: 5001 }, (_, index) => `m-${index}`);
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(ids);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue([]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1");

    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(5001);
  });

  it("calcule le delta sans écrire en dry-run", async () => {
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur-1" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1", "m2", "m3"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue(["m2", "m4"]);

    const result = await missionDiffusionService.rebuildForDistributionPublisher("publisher-1", { dryRun: true });

    expect(result).toMatchObject({ distributionPublisherId: "publisher-1", desired: 3, added: 2, removed: 1, dryRun: true });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteManyForDistributionPublisher).not.toHaveBeenCalled();
  });
});

describe("missionDiffusionService.rebuildAll", () => {
  it("rebuild chaque publisher à allowlist puis purge les publishers retirés, et agrège les compteurs", async () => {
    ruleServiceMock.findDistributionPublisherIdsWithAllowlist.mockResolvedValue(["d1", "d2"]);
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur" });
    missionRepositoryMock.findIds.mockImplementation(async () => ["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue([]);
    missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(3);

    const result = await missionDiffusionService.rebuildAll();

    expect(missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1", "d2"]);
    expect(result.distributionPublishers).toBe(2);
    expect(result.added).toBe(2); // 1 par publisher
    expect(result.prunedDistributionPublishers).toBe(3);
    expect(result.removed).toBe(3); // 0 diff par publisher + 3 purgées
    expect(result.perDistributionPublisher).toHaveLength(2);
  });

  it("acquiert et libère un advisory lock autour du rebuild complet", async () => {
    ruleServiceMock.findDistributionPublisherIdsWithAllowlist.mockResolvedValue([]);
    missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn.mockResolvedValue(0);

    await missionDiffusionService.rebuildAll();

    expect(pgClientMock.connect).toHaveBeenCalledTimes(1);
    expect(pgClientMock.query).toHaveBeenCalledWith("SELECT pg_try_advisory_lock($1, $2) AS locked", expect.any(Array));
    expect(pgClientMock.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock($1, $2)", expect.any(Array));
    expect(pgClientMock.end).toHaveBeenCalledTimes(1);
  });

  it("compte la purge globale sans supprimer en dry-run", async () => {
    ruleServiceMock.findDistributionPublisherIdsWithAllowlist.mockResolvedValue(["d1"]);
    ruleServiceMock.buildMissionDiffuseurAllowlistWhere.mockResolvedValue({ publisherId: "annonceur" });
    missionRepositoryMock.findIds.mockResolvedValue(["m1"]);
    missionDiffusionRepositoryMock.findMissionIdsByDistributionPublisher.mockResolvedValue([]);
    missionDiffusionRepositoryMock.countRowsForDistributionPublishersNotIn.mockResolvedValue(4);

    const result = await missionDiffusionService.rebuildAll({ dryRun: true });

    expect(result).toMatchObject({
      distributionPublishers: 1,
      added: 1,
      removed: 4,
      prunedDistributionPublishers: 4,
      dryRun: true,
    });
    expect(missionDiffusionRepositoryMock.countRowsForDistributionPublishersNotIn).toHaveBeenCalledWith(["d1"]);
    expect(missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.createManyForDistributionPublisher).not.toHaveBeenCalled();
  });

  it("ignore le rebuild complet quand un autre rebuild détient déjà le lock", async () => {
    pgClientMock.query.mockImplementationOnce(async () => ({ rows: [{ locked: false }] }));

    const result = await missionDiffusionService.rebuildAll();

    expect(result).toMatchObject({
      distributionPublishers: 0,
      added: 0,
      removed: 0,
      prunedDistributionPublishers: 0,
      perDistributionPublisher: [],
      skippedBecauseAlreadyRunning: true,
    });
    expect(ruleServiceMock.findDistributionPublisherIdsWithAllowlist).not.toHaveBeenCalled();
    expect(missionDiffusionRepositoryMock.deleteRowsForDistributionPublishersNotIn).not.toHaveBeenCalled();
    expect(pgClientMock.query).not.toHaveBeenCalledWith("SELECT pg_advisory_unlock($1, $2)", expect.any(Array));
    expect(pgClientMock.end).toHaveBeenCalledTimes(1);
  });
});
