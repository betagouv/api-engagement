import { describe, expect, it } from "vitest";

import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import type { ScoringInputValue } from "@/services/mission-scoring/types";

const buildInputValue = (overrides: Partial<ScoringInputValue> = {}): ScoringInputValue => ({
  missionEnrichmentValueId: "mev-1",
  taxonomyKey: "domaine",
  taxonomyType: "multi_value",
  taxonomyValueId: "tv-1",
  taxonomyValueKey: "social_solidarite",
  order: 0,
  confidence: 0.73,
  ...overrides,
});

describe("computeMissionScoringValues", () => {
  it("projects multi-value scores from confidence", () => {
    const result = computeMissionScoringValues([buildInputValue()]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-1",
        score: 0.73,
      },
    ]);
    expect(result.ignored).toEqual([]);
  });

  it("keeps categorical values as exact projections", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        taxonomyKey: "type_mission",
        taxonomyType: "categorical",
        taxonomyValueId: "tv-ponctuelle",
        taxonomyValueKey: "ponctuelle",
        confidence: 0.41,
      }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-ponctuelle",
        score: 0.41,
      },
    ]);
  });

  it("ignores neutral gate values", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        taxonomyKey: "accessibilite",
        taxonomyType: "gate",
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

  it("clamps scores to the [0, 1] range with 6 decimals", () => {
    const result = computeMissionScoringValues([
      buildInputValue({ missionEnrichmentValueId: "mev-low", taxonomyValueId: "tv-low", confidence: -1 }),
      buildInputValue({ missionEnrichmentValueId: "mev-high", taxonomyValueId: "tv-high", confidence: 1.23456789 }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-low",
        taxonomyValueId: "tv-low",
        score: 0,
      },
      {
        missionEnrichmentValueId: "mev-high",
        taxonomyValueId: "tv-high",
        score: 1,
      },
    ]);
  });

  it("deduplicates on taxonomy value id by keeping the highest score", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        missionEnrichmentValueId: "mev-1",
        taxonomyValueId: "tv-1",
        confidence: 0.35,
      }),
      buildInputValue({
        missionEnrichmentValueId: "mev-2",
        taxonomyValueId: "tv-1",
        confidence: 0.85,
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
