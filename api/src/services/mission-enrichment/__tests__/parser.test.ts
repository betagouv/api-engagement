import { describe, expect, it } from "vitest";

import { parseEnrichmentResponse, type TaxonomyLookup } from "../parser";

const buildLookup = (): TaxonomyLookup => {
  const lookup: TaxonomyLookup = new Map();
  lookup.set(
    "domaine",
    new Map([
      ["sante_soins", "tv-sante"],
      ["social_solidarite", "tv-social"],
    ]),
  );
  lookup.set("type_mission", new Map([["ponctuelle", "tv-ponctuelle"]]));
  return lookup;
};

const validClassification = {
  dimension_key: "domaine",
  value_key: "sante_soins",
  confidence: 0.9,
  evidence: { extract: "soins infirmiers", reasoning: "mission de santé" },
};

describe("parseEnrichmentResponse", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({ classifications: [validClassification] });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
    expect(valid[0].taxonomyValueId).toBe("tv-sante");
    expect(valid[0].confidence).toBe(0.9);
    expect(skipped).toHaveLength(0);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const raw = "```json\n" + JSON.stringify({ classifications: [validClassification] }) + "\n```";
    const { valid } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
    expect(valid[0].value_key).toBe("sante_soins");
  });

  it("handles code fences without json tag", () => {
    const raw = "```\n" + JSON.stringify({ classifications: [validClassification] }) + "\n```";
    const { valid } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
  });

  it("skips unknown dimension keys", () => {
    const raw = JSON.stringify({
      classifications: [{ ...validClassification, dimension_key: "unknown_dim" }],
    });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("unknown_dimension");
  });

  it("skips unknown value keys", () => {
    const raw = JSON.stringify({
      classifications: [{ ...validClassification, value_key: "unknown_val" }],
    });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("unknown_value");
  });

  it("skips classifications below confidence threshold", () => {
    const raw = JSON.stringify({
      classifications: [{ ...validClassification, confidence: 0.2 }],
    });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("below_threshold");
  });

  it("keeps classifications at exactly the threshold", () => {
    const raw = JSON.stringify({
      classifications: [{ ...validClassification, confidence: 0.3 }],
    });
    const { valid } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(1);
  });

  it("handles multiple classifications across dimensions", () => {
    const raw = JSON.stringify({
      classifications: [
        validClassification,
        { ...validClassification, dimension_key: "type_mission", value_key: "ponctuelle", confidence: 0.8 },
      ],
    });
    const { valid } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(2);
    expect(valid[0].taxonomyValueId).toBe("tv-sante");
    expect(valid[1].taxonomyValueId).toBe("tv-ponctuelle");
  });

  it("handles empty classifications array", () => {
    const raw = JSON.stringify({ classifications: [] });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseEnrichmentResponse("not json", buildLookup(), 0.3)).toThrow();
  });

  it("throws on missing classifications key", () => {
    const raw = JSON.stringify({ results: [] });
    expect(() => parseEnrichmentResponse(raw, buildLookup(), 0.3)).toThrow();
  });

  it("throws on invalid classification structure", () => {
    const raw = JSON.stringify({
      classifications: [{ dimension_key: "domaine" }],
    });
    expect(() => parseEnrichmentResponse(raw, buildLookup(), 0.3)).toThrow();
  });

  it("separates valid and skipped correctly in mixed response", () => {
    const raw = JSON.stringify({
      classifications: [
        validClassification,
        { ...validClassification, dimension_key: "unknown" },
        { ...validClassification, confidence: 0.1 },
        { ...validClassification, dimension_key: "domaine", value_key: "social_solidarite", confidence: 0.5 },
      ],
    });
    const { valid, skipped } = parseEnrichmentResponse(raw, buildLookup(), 0.3);

    expect(valid).toHaveLength(2);
    expect(skipped).toHaveLength(2);
  });
});
