import { describe, expect, it } from "vitest";
import { TAXONOMY } from "../taxonomy";
import type { TaxonomyKey } from "../types";
import { ENRICHABLE_TAXONOMIES, GATE_TAXONOMIES, getTaxonomyList, isValidTaxonomyValueKey, parseTaxonomyValueKey } from "../utils";

describe("parseTaxonomyValueKey", () => {
  it("découpe une clé plate valide en taxonomie + valeur", () => {
    expect(parseTaxonomyValueKey("domaine.sante_soins")).toEqual({
      taxonomyKey: "domaine",
      valueKey: "sante_soins",
    });
  });

  it("ne découpe qu'au premier point", () => {
    expect(parseTaxonomyValueKey("a.b.c")).toEqual({ taxonomyKey: "a", valueKey: "b.c" });
  });

  it("retourne null sans point", () => {
    expect(parseTaxonomyValueKey("abc")).toBeNull();
  });

  it("retourne null si le point est en tête", () => {
    expect(parseTaxonomyValueKey(".b")).toBeNull();
  });

  it("retourne null si le point est en fin", () => {
    expect(parseTaxonomyValueKey("a.")).toBeNull();
  });
});

describe("isValidTaxonomyValueKey", () => {
  it("accepte une clé réelle issue de TAXONOMY", () => {
    expect(isValidTaxonomyValueKey("domaine.sante_soins")).toBe(true);
  });

  it("rejette une taxonomie inconnue", () => {
    expect(isValidTaxonomyValueKey("inconnue.valeur")).toBe(false);
  });

  it("rejette une valeur inconnue d'une taxonomie connue", () => {
    expect(isValidTaxonomyValueKey("domaine.valeur_qui_nexiste_pas")).toBe(false);
  });

  it("rejette une clé malformée", () => {
    expect(isValidTaxonomyValueKey("domaine")).toBe(false);
  });
});

describe("getTaxonomyList", () => {
  const list = getTaxonomyList();

  it("retourne une entrée par taxonomie", () => {
    expect(list).toHaveLength(Object.keys(TAXONOMY).length);
  });

  it("expose key/label/type/values pour chaque entrée", () => {
    for (const item of list) {
      expect(typeof item.key).toBe("string");
      expect(typeof item.label).toBe("string");
      expect(typeof item.type).toBe("string");
      expect(Array.isArray(item.values)).toBe(true);
    }
  });

  it("attribue un order croissant et contigu aux valeurs", () => {
    for (const item of list) {
      item.values.forEach((value, index) => {
        expect(value.order).toBe(index);
      });
    }
  });
});

describe("ENRICHABLE_TAXONOMIES / GATE_TAXONOMIES", () => {
  it("ENRICHABLE_TAXONOMIES contient exactement les taxonomies enrichable", () => {
    const expected = (Object.keys(TAXONOMY) as TaxonomyKey[]).filter((key) => TAXONOMY[key].enrichable);
    expect([...ENRICHABLE_TAXONOMIES].sort()).toEqual(expected.sort());
  });

  it("GATE_TAXONOMIES contient exactement les taxonomies gate", () => {
    const expected = (Object.keys(TAXONOMY) as TaxonomyKey[]).filter((key) => TAXONOMY[key].gate);
    expect([...GATE_TAXONOMIES].sort()).toEqual(expected.sort());
  });
});
