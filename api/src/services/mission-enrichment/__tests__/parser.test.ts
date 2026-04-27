import { describe, expect, it } from "vitest";

import { validateEnrichmentClassifications, type TaxonomyLookup } from "@/services/mission-enrichment/parser";

const buildLookup = (): TaxonomyLookup => {
  const lookup: TaxonomyLookup = new Map();
  lookup.set("domaine", {
    type: "multi_value",
    values: new Map([
      ["sante_soins", { taxonomyValueId: "tv-sante" }],
      ["social_solidarite", { taxonomyValueId: "tv-social" }],
    ]),
  });
  lookup.set("type_mission", {
    type: "categorical",
    values: new Map([["ponctuelle", { taxonomyValueId: "tv-ponctuelle" }]]),
  });
  return lookup;
};

const validClassification = {
  taxonomy_key: "domaine",
  value_key: "sante_soins",
  confidence: 0.9,
  evidence: { extract: "soins infirmiers", reasoning: "mission de santé" },
};

describe("validateEnrichmentClassifications", () => {
  it("validates and resolves taxonomy value ID", () => {
    const { valid, skipped } = validateEnrichmentClassifications([validClassification], buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
    expect(valid[0].taxonomyValueId).toBe("tv-sante");
    expect(valid[0].confidence).toBe(0.9);
    expect(skipped).toHaveLength(0);
  });

  it("skips unknown taxonomy keys", () => {
    const { valid, skipped } = validateEnrichmentClassifications([{ ...validClassification, taxonomy_key: "unknown_dim" }], buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("unknown_taxonomy");
  });

  it("skips unknown value keys", () => {
    const { valid, skipped } = validateEnrichmentClassifications([{ ...validClassification, value_key: "unknown_val" }], buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("unknown_value");
  });

  it("skips classifications below confidence threshold", () => {
    const { valid, skipped } = validateEnrichmentClassifications([{ ...validClassification, confidence: 0.2 }], buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("below_threshold");
  });

  it("keeps classifications at exactly the threshold", () => {
    const { valid } = validateEnrichmentClassifications([{ ...validClassification, confidence: 0.3 }], buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
  });

  it("handles multiple classifications across taxonomys", () => {
    const { valid } = validateEnrichmentClassifications(
      [validClassification, { ...validClassification, taxonomy_key: "type_mission", value_key: "ponctuelle", confidence: 0.8 }],
      buildLookup(),
      0.3
    );

    expect(valid).toHaveLength(2);
    expect(valid[0].taxonomyValueId).toBe("tv-sante");
    expect(valid[1].taxonomyValueId).toBe("tv-ponctuelle");
  });

  it("handles empty classifications array", () => {
    const { valid, skipped } = validateEnrichmentClassifications([], buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it("separates valid and skipped correctly in mixed response", () => {
    const { valid, skipped } = validateEnrichmentClassifications(
      [
        validClassification,
        { ...validClassification, taxonomy_key: "unknown" },
        { ...validClassification, confidence: 0.1 },
        { ...validClassification, taxonomy_key: "domaine", value_key: "social_solidarite", confidence: 0.5 },
      ],
      buildLookup(),
      0.3
    );

    expect(valid).toHaveLength(2);
    expect(skipped).toHaveLength(2);
  });

  it("deduplicates same taxonomy+value, keeps highest confidence", () => {
    const { valid } = validateEnrichmentClassifications(
      [
        { ...validClassification, confidence: 0.7 },
        { ...validClassification, confidence: 0.9 },
      ],
      buildLookup(),
      0.3
    );

    expect(valid).toHaveLength(1);
    expect(valid[0].confidence).toBe(0.9);
  });

  it("fuzzy matches reordered value_key tokens", () => {
    // "soins_sante" vs "sante_soins" → Jaccard = 1.0
    const { valid, skipped } = validateEnrichmentClassifications([{ ...validClassification, value_key: "soins_sante" }], buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
    expect(valid[0].value_key).toBe("sante_soins");
    expect(valid[0].taxonomyValueId).toBe("tv-sante");
    expect(skipped).toHaveLength(0);
  });

  it("skips value_key with insufficient fuzzy similarity", () => {
    // "culture_arts" has no tokens in common with "sante_soins" or "social_solidarite"
    const { valid, skipped } = validateEnrichmentClassifications([{ ...validClassification, value_key: "culture_arts" }], buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped[0].reason).toContain("unknown_value");
  });

  it("keeps multiple values for the same taxonomy when they are distinct", () => {
    const lookup: TaxonomyLookup = new Map([
      [
        "type_mission",
        {
          type: "categorical",
          values: new Map([
            ["ponctuelle", { taxonomyValueId: "tv-p" }],
            ["reguliere", { taxonomyValueId: "tv-r" }],
          ]),
        },
      ],
    ]);

    const { valid, skipped } = validateEnrichmentClassifications(
      [
        { ...validClassification, taxonomy_key: "type_mission", value_key: "ponctuelle", confidence: 0.6 },
        { ...validClassification, taxonomy_key: "type_mission", value_key: "reguliere", confidence: 0.9 },
      ],
      lookup,
      0.3
    );

    expect(valid).toHaveLength(2);
    expect(valid.map((item) => item.value_key)).toEqual(["ponctuelle", "reguliere"]);
    expect(skipped).toHaveLength(0);
  });
});
