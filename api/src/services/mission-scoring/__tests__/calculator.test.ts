import { describe, expect, it } from "vitest";

import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { MISSION_SCORING_RULESET_V1 } from "@/services/mission-scoring/config";
import type { ScoringInputValue } from "@/services/mission-scoring/types";

const buildInputValue = (overrides: Partial<ScoringInputValue> = {}): ScoringInputValue => ({
  missionEnrichmentValueId: "mev-1",
  taxonomyKey: "domaine",
  valueKey: "social_solidarite",
  confidence: 0.73,
  ...overrides,
});

describe("computeMissionScoringValues", () => {
  it("projects multi-value scores through the deterministic confidence mapping", () => {
    const result = computeMissionScoringValues([buildInputValue()]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyKey: "domaine",
        valueKey: "social_solidarite",
        score: 0.6,
      },
    ]);
    expect(result.ignored).toEqual([]);
  });

  it("keeps categorical values and maps their confidence bucket", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        taxonomyKey: "type_mission",
        valueKey: "ponctuelle",
        confidence: 0.94,
      }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-1",
        taxonomyKey: "type_mission",
        valueKey: "ponctuelle",
        score: 0.85,
      },
    ]);
  });

  it("ignores values listed in ignoredValueKeys", () => {
    // Use a custom ruleset to test the mechanism with a valid TaxonomyKey
    const ruleset = { ...MISSION_SCORING_RULESET_V1, ignoredValueKeys: ["domaine.non_specifie"] };
    const result = computeMissionScoringValues(
      [
        buildInputValue({
          taxonomyKey: "domaine",
          valueKey: "non_specifie",
        }),
      ],
      ruleset
    );

    expect(result.values).toEqual([]);
    expect(result.ignored).toEqual([
      expect.objectContaining({
        taxonomyKey: "domaine",
        valueKey: "non_specifie",
        reason: "ignored_value:domaine.non_specifie",
      }),
    ]);
  });

  it("ignores values below the confidence threshold", () => {
    const result = computeMissionScoringValues([buildInputValue({ missionEnrichmentValueId: "mev-low", confidence: 0.54 })]);

    expect(result.values).toEqual([]);
    expect(result.ignored).toEqual([
      expect.objectContaining({
        missionEnrichmentValueId: "mev-low",
        reason: "below_threshold:0.54 < 0.55",
      }),
    ]);
  });

  it("maps confidence buckets at exact boundaries", () => {
    const result = computeMissionScoringValues([
      buildInputValue({ missionEnrichmentValueId: "mev-055", valueKey: "bucket_055", confidence: 0.55 }),
      buildInputValue({ missionEnrichmentValueId: "mev-070", valueKey: "bucket_070", confidence: 0.7 }),
      buildInputValue({ missionEnrichmentValueId: "mev-085", valueKey: "bucket_085", confidence: 0.85 }),
      buildInputValue({ missionEnrichmentValueId: "mev-095", valueKey: "bucket_095", confidence: 0.95 }),
      buildInputValue({ missionEnrichmentValueId: "mev-max", valueKey: "bucket_max", confidence: 1.23456789 }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-055",
        taxonomyKey: "domaine",
        valueKey: "bucket_055",
        score: 0.35,
      },
      {
        missionEnrichmentValueId: "mev-070",
        taxonomyKey: "domaine",
        valueKey: "bucket_070",
        score: 0.6,
      },
      {
        missionEnrichmentValueId: "mev-085",
        taxonomyKey: "domaine",
        valueKey: "bucket_085",
        score: 0.85,
      },
      {
        missionEnrichmentValueId: "mev-095",
        taxonomyKey: "domaine",
        valueKey: "bucket_095",
        score: 1,
      },
      {
        missionEnrichmentValueId: "mev-max",
        taxonomyKey: "domaine",
        valueKey: "bucket_max",
        score: 1,
      },
    ]);
  });

  it("deduplicates on taxonomy value key by keeping the highest score", () => {
    const result = computeMissionScoringValues([
      buildInputValue({
        missionEnrichmentValueId: "mev-1",
        confidence: 0.58,
      }),
      buildInputValue({
        missionEnrichmentValueId: "mev-2",
        confidence: 0.94,
      }),
    ]);

    expect(result.values).toEqual([
      {
        missionEnrichmentValueId: "mev-2",
        taxonomyKey: "domaine",
        valueKey: "social_solidarite",
        score: 0.85,
      },
    ]);
  });
});
