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

import { PUBLISHER_IDS } from "@/config";
import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
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
  taxonomyKey: "domaine",
  valueKey: "social_solidarite",
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
      mission: { publisherId: null, type: null },
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
      mission: { publisherId: null, type: null },
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
          taxonomyKey: "domaine",
          valueKey: "social_solidarite",
          score: 0.6,
        },
      ],
    });
  });

  it("persists an empty scoring when force clears all derived values", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      mission: { publisherId: null, type: null },
      values: [
        buildEnrichmentValue({
          taxonomyKey: "accessibilite",
          valueKey: "non_specifie",
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

  it("skips persistence when every enrichment value falls below the confidence threshold", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      mission: { publisherId: null, type: null },
      values: [buildEnrichmentValue({ confidence: 0.54 })],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).not.toHaveBeenCalled();
  });

  it("persists scoring values from publisher rules without enrichment values", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      mission: { publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE, type: null },
      values: [],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      values: [
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "moins_18_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_18_25_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "moins_31_ans_handicap",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "type_mission",
          valueKey: "temps_plein",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "dispositif",
          valueKey: "service_civique",
          score: 1,
        },
      ],
    });
  });

  it("persists scoring values from mission type rules without enrichment values", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue({
      id: "enrichment-1",
      missionId: "mission-1",
      mission: { publisherId: null, type: "volontariat_sapeurs_pompiers" },
      values: [],
    });
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
    });

    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith({
      missionId: "mission-1",
      missionEnrichmentId: "enrichment-1",
      values: [
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "dispositif",
          valueKey: "sapeurs_pompiers",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_16_17_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_18_25_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_25_30_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_30_45_ans",
          score: 1,
        },
        {
          missionEnrichmentValueId: null,
          taxonomyKey: "tranche_age",
          valueKey: "entre_46_66_ans",
          score: 1,
        },
      ],
    });
  });
});

describe("missionScoringService.score — enrichment selection", () => {
  beforeEach(() => {
    missionEnrichmentRepositoryMock.findFirst.mockReset();
    missionScoringRepositoryMock.findUnique.mockReset();
    missionScoringRepositoryMock.replaceForEnrichment.mockReset();
  });

  const buildEnrichment = (id: string) => ({
    id,
    missionId: "mission-1",
    mission: { publisherId: null, type: null },
    values: [buildEnrichmentValue()],
  });

  it("targets the active prompt version when no enrichment id is given", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue(buildEnrichment("enrichment-active"));
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({ missionId: "mission-1", force: true });

    expect(missionEnrichmentRepositoryMock.findFirst).toHaveBeenCalledTimes(1);
    expect(missionEnrichmentRepositoryMock.findFirst.mock.calls[0][0].where).toMatchObject({
      missionId: "mission-1",
      status: "completed",
      promptVersion: CURRENT_PROMPT_VERSION,
    });
    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith(expect.objectContaining({ missionEnrichmentId: "enrichment-active" }));
  });

  it("falls back to the latest completed enrichment when none exists for the active version", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(buildEnrichment("enrichment-fallback"));
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({ missionId: "mission-1", force: true });

    expect(missionEnrichmentRepositoryMock.findFirst).toHaveBeenCalledTimes(2);
    expect(missionEnrichmentRepositoryMock.findFirst.mock.calls[1][0].where).not.toHaveProperty("promptVersion");
    expect(missionScoringRepositoryMock.replaceForEnrichment).toHaveBeenCalledWith(expect.objectContaining({ missionEnrichmentId: "enrichment-fallback" }));
  });

  it("targets the exact enrichment id without version filter or fallback", async () => {
    missionEnrichmentRepositoryMock.findFirst.mockResolvedValue(buildEnrichment("enrichment-explicit"));
    missionScoringRepositoryMock.findUnique.mockResolvedValue(null);

    await missionScoringService.score({ missionId: "mission-1", missionEnrichmentId: "enrichment-explicit", force: true });

    expect(missionEnrichmentRepositoryMock.findFirst).toHaveBeenCalledTimes(1);
    const where = missionEnrichmentRepositoryMock.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "enrichment-explicit", missionId: "mission-1", status: "completed" });
    expect(where).not.toHaveProperty("promptVersion");
  });
});
