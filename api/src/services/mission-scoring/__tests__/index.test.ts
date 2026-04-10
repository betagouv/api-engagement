import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/mission-enrichment", () => ({
  missionEnrichmentRepository: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/repositories/mission-scoring", () => ({
  missionScoringRepository: {
    findUnique: vi.fn(),
    replaceForEnrichment: vi.fn(),
  },
}));

import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { missionScoringService } from "@/services/mission-scoring";

const missionEnrichmentRepositoryMock = missionEnrichmentRepository as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
};

const missionScoringRepositoryMock = missionScoringRepository as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  replaceForEnrichment: ReturnType<typeof vi.fn>;
};

const buildEnrichmentValue = (overrides: Record<string, unknown> = {}) => ({
  id: "mev-1",
  confidence: 0.76,
  taxonomyValueId: "tv-1",
  taxonomyValue: {
    id: "tv-1",
    key: "social_solidarite",
    order: 0,
    taxonomy: {
      key: "domaine",
      type: "multi_value",
    },
  },
  ...overrides,
});

describe("missionScoringService.score", () => {
  beforeEach(() => {
    missionEnrichmentRepositoryMock.findFirst.mockReset();
    missionScoringRepositoryMock.findUnique.mockReset();
    missionScoringRepositoryMock.replaceForEnrichment.mockReset();
  });

  it("ignores missing completed enrichments", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue(null);

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
    });

    expect(missionScoringRepositoryMock.findUnique).not.toHaveBeenCalled();
    expect(missionScoringRepositoryMock.replaceForEnrichment).not.toHaveBeenCalled();
  });

  it("is idempotent when a scoring already exists and force is not set", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      values: [buildEnrichmentValue()],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue({ id: "mission-scoring-1" });

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).not.toHaveBeenCalled();
  });

  it("replaces existing scoring values when force is enabled", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      values: [buildEnrichmentValue()],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue({ id: "mission-scoring-1" });

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      force: true,
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      values: [
        {
          missionEnrichmentValueId: "mev-1",
          taxonomyValueId: "tv-1",
          score: 0.76,
        },
      ],
    });
  });

  it("persists an empty scoring when force clears all derived values", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      values: [
        buildEnrichmentValue({
          taxonomyValueId: "tv-non-specifie",
          taxonomyValue: {
            id: "tv-non-specifie",
            key: "non_specifie",
            order: 1,
            taxonomy: {
              key: "accessibilite",
              type: "gate",
            },
          },
        }),
      ],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue({ id: "mission-scoring-1" });

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      force: true,
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      values: [],
    });
  });
});
