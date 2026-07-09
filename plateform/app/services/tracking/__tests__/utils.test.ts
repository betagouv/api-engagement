import { describe, expect, it } from "vitest";

import type { ScreenAnswer } from "~/types/quiz";
import { resolveAnswerValue, resolveGeoProps } from "../utils";

describe("resolveAnswerValue", () => {
  it("retourne la valeur unique pour une sélection simple", () => {
    const answer: ScreenAnswer = { type: "options", taxonomy: "statut", option_ids: ["lyceen"] };
    expect(resolveAnswerValue(answer)).toBe("lyceen");
  });

  it("retourne le tableau des valeurs pour une multi-sélection", () => {
    const answer: ScreenAnswer = { type: "options", taxonomy: "domaine", option_ids: ["sante", "education"] };
    expect(resolveAnswerValue(answer)).toEqual(["sante", "education"]);
  });

  it("retourne undefined pour une sélection vide", () => {
    const answer: ScreenAnswer = { type: "options", taxonomy: "domaine", option_ids: [] };
    expect(resolveAnswerValue(answer)).toBeUndefined();
  });

  it("retourne le nombre brut pour une réponse numeric (age)", () => {
    const answer: ScreenAnswer = { type: "numeric", value: 22 };
    expect(resolveAnswerValue(answer)).toBe(22);
  });

  it("retourne le label pour une réponse params géolocalisée", () => {
    const answer: ScreenAnswer = { type: "params", taxonomy: "location", params: { lat: 48.85, lon: 2.35, label: "Paris (75001)" } };
    expect(resolveAnswerValue(answer)).toBe("Paris (75001)");
  });

  it("retourne undefined pour une réponse params sans label", () => {
    const answer: ScreenAnswer = { type: "params", taxonomy: "tranche_age", params: { age: 22, handicap: false } };
    expect(resolveAnswerValue(answer)).toBeUndefined();
  });

  it("retourne la valeur pour une réponse text", () => {
    const answer: ScreenAnswer = { type: "text", value: "infirmier" };
    expect(resolveAnswerValue(answer)).toBe("infirmier");
  });

  it("retourne undefined quand la réponse est absente", () => {
    expect(resolveAnswerValue(undefined)).toBeUndefined();
  });
});

describe("resolveGeoProps", () => {
  it("extrait les props géo d'une réponse params localisée", () => {
    const answer: ScreenAnswer = {
      type: "params",
      taxonomy: "location",
      params: { lat: 48.8566, lon: 2.3522, postcode: "75001", country_code: "fr", label: "Paris (75001)" },
    };
    expect(resolveGeoProps(answer)).toEqual({
      geo_lat: 48.8566,
      geo_lon: 2.3522,
      geo_postcode: "75001",
      geo_country_code: "fr",
    });
  });

  it("renvoie des props undefined pour un params sans données géo (tranche_age)", () => {
    const answer: ScreenAnswer = { type: "params", taxonomy: "tranche_age", params: { age: 22, handicap: false } };
    expect(resolveGeoProps(answer)).toEqual({
      geo_lat: undefined,
      geo_lon: undefined,
      geo_postcode: undefined,
      geo_country_code: undefined,
    });
  });

  it("renvoie un objet vide pour une réponse non-params", () => {
    const answer: ScreenAnswer = { type: "options", taxonomy: "statut", option_ids: ["lyceen"] };
    expect(resolveGeoProps(answer)).toEqual({});
  });

  it("renvoie un objet vide quand la réponse est absente", () => {
    expect(resolveGeoProps(undefined)).toEqual({});
  });
});
