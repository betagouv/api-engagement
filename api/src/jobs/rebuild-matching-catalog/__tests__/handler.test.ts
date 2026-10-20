import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/matching-catalog", () => ({
  matchingCatalogRepository: {
    beginBuild: vi.fn(),
    rebuildBatch: vi.fn(),
    finishBuild: vi.fn(),
    abortBuild: vi.fn(),
  },
}));

import { prisma } from "@/db/postgres";
import { matchingCatalogRepository } from "@/repositories/matching-catalog";
import { RebuildMatchingCatalogHandler } from "@/jobs/rebuild-matching-catalog/handler";

const findMany = vi.mocked(prisma.missionScoring.findMany);
const repository = vi.mocked(matchingCatalogRepository);

describe("RebuildMatchingCatalogHandler", () => {
  beforeEach(() => {
    findMany.mockReset();
    repository.beginBuild.mockReset();
    repository.rebuildBatch.mockReset();
    repository.abortBuild.mockReset();
    repository.finishBuild.mockReset().mockResolvedValue(true);
  });

  it("refuse les paramètres invalides avant toute écriture", async () => {
    await expect(new RebuildMatchingCatalogHandler().handle({ batchSize: 0 })).rejects.toThrow();
    await expect(new RebuildMatchingCatalogHandler().handle({ dryRun: "false" } as never)).rejects.toThrow();
    expect(repository.beginBuild).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("ne publie pas un catalogue si un lot échoue", async () => {
    findMany.mockResolvedValueOnce([{ id: "a" }] as never);
    repository.rebuildBatch.mockRejectedValueOnce(new Error("lot interrompu"));
    await expect(new RebuildMatchingCatalogHandler().handle({ promptVersion: "v5" })).rejects.toThrow("lot interrompu");
    expect(repository.finishBuild).not.toHaveBeenCalled();
    expect(repository.abortBuild).toHaveBeenCalledWith("v5", expect.any(String));
  });

  it("publie uniquement après la dernière page et parcourt les lots par curseur", async () => {
    findMany
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }] as never)
      .mockResolvedValueOnce([{ id: "c" }] as never)
      .mockResolvedValueOnce([]);
    const result = await new RebuildMatchingCatalogHandler().handle({ promptVersion: "v5", batchSize: 2 });
    expect(result).toMatchObject({ success: true, processed: 3, batches: 2, ready: true });
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { missionEnrichment: { promptVersion: "v5" }, id: { gt: "b" } } }));
    expect(repository.finishBuild.mock.invocationCallOrder[0]).toBeGreaterThan(repository.rebuildBatch.mock.invocationCallOrder[1]);
  });
});
