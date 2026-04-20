import { describe, expect, it } from "vitest";

import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import type { ScoringInputValue } from "@/services/mission-scoring/types";

const buildInputValue = (overrides: Partial<ScoringInputValue> = {}): ScoringInputValue => ({
  missionEnrichmentValueId: "mev-1",
  taxonomyKey: "domaine",
  taxonomyValueId: "tv-1",
  taxonomyValueKey: "social_solidarite",
  confidence: 0.73,
  ...overrides,
});

describe("computeMissionScoringValues", () => {
  it("projects multi-value scores through the deterministic confidence mapping", () => {
    const result = computeMissionScoringValues([buildInputValue()]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-1",
        score: 0.6,
      },
    ]);
    expect(result.ignored).toEqual([]);
  });

  it("keeps categorical values and maps their confidence bucket", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        taxonomyKey: "type_mission",
        taxonomyValueId: "tv-ponctuelle",
        taxonomyValueKey: "ponctuelle",
        confidence: 0.94,
      }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-ponctuelle",
        score: 0.85,
      },
    ]);
  });

  it("ignores neutral gate values", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        taxonomyKey: "accessibilite",
        taxonomyValueId: "tv-non-specifie",
        taxonomyValueKey: "non_specifie",
      }),
    ]);

    expect(result.values).toEqual([]);
    expect(result.ignored).toEqual([
      expect.objectContaining({
        taxonomyKey: "accessibilite",
        taxonomyValueKey: "non_specifie",
        reason: "ignored_value:accessibilite.non_specifie",
      }),
    ]);
  });

  it("ignores values below the confidence threshold", () => {
    const result = computeMissionScoringValues([buildInputValue({ missionEnrichmentValueId: "mev-low", taxonomyValueId: "tv-low", confidence: 0.54 })]);

    expect(result.values).toEqual([]);
    expect(result.ignored).toEqual([
      expect.objectContaining({
        missionEnrichmentValueId: "mev-low",
        taxonomyValueId: "tv-low",
        reason: "below_threshold:0.54 < 0.55",
      }),
    ]);
  });

  it("maps confidence buckets at exact boundaries", () => {
    const result = computeMissionScoringValues([
      buildInputValue({ missionEnrichmentValueId: "mev-055", taxonomyValueId: "tv-055", confidence: 0.55 }),
      buildInputValue({ missionEnrichmentValueId: "mev-070", taxonomyValueId: "tv-070", confidence: 0.7 }),
      buildInputValue({ missionEnrichmentValueId: "mev-085", taxonomyValueId: "tv-085", confidence: 0.85 }),
      buildInputValue({ missionEnrichmentValueId: "mev-095", taxonomyValueId: "tv-095", confidence: 0.95 }),
      buildInputValue({ missionEnrichmentValueId: "mev-max", taxonomyValueId: "tv-max", confidence: 1.23456789 }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-055",
        taxonomyValueId: "tv-055",
        score: 0.35,
      },
      {
        missionEnrichmentValueId: "mev-070",
        taxonomyValueId: "tv-070",
        score: 0.6,
      },
      {
        missionEnrichmentValueId: "mev-085",
        taxonomyValueId: "tv-085",
        score: 0.85,
      },
      {
        missionEnrichmentValueId: "mev-095",
        taxonomyValueId: "tv-095",
        score: 1,
      },
      {
        missionEnrichmentValueId: "mev-max",
        taxonomyValueId: "tv-max",
        score: 1,
      },
    ]);
  });

  it("deduplicates on taxonomy value id by keeping the highest score", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-1",
        confidence: 0.58,
      }),
      buildInputValue({
        missionEnrichmentValueId: "mev-2",
        taxonomyValueId: "tv-1",
        confidence: 0.94,
      }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-2",
        taxonomyValueId: "tv-1",
        score: 0.85,
      },
    ]);
  });
});
