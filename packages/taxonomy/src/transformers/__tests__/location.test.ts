import { describe, expect, it } from "vitest";
import { resolveLocationValues } from "../location";

describe("resolveLocationValues", () => {
  it("résout des coordonnées valides", () => {
    expect(resolveLocationValues({ lat: 48.85, lon: 2.35 })).toEqual({ geo: { lat: 48.85, lon: 2.35 } });
  });

  it("reprend radius_km quand fourni", () => {
    expect(resolveLocationValues({ lat: 48.85, lon: 2.35, radius_km: 10 })).toEqual({
      geo: { lat: 48.85, lon: 2.35, radiusKm: 10 },
    });
  });

  it("met country_code en majuscules", () => {
    expect(resolveLocationValues({ lat: 48.85, lon: 2.35, country_code: "fr" })).toEqual({
      geo: { lat: 48.85, lon: 2.35, countryCode: "FR" },
    });
  });

  it("lève une erreur si lat est hors bornes", () => {
    expect(() => resolveLocationValues({ lat: 91, lon: 2.35 })).toThrow(/lat must be a number between -90 and 90/);
  });

  it("lève une erreur si lon est hors bornes", () => {
    expect(() => resolveLocationValues({ lat: 48.85, lon: 181 })).toThrow(/lon must be a number between -180 and 180/);
  });

  it("lève une erreur si radius_km n'est pas positif", () => {
    expect(() => resolveLocationValues({ lat: 48.85, lon: 2.35, radius_km: 0 })).toThrow(/radius_km must be a positive number/);
  });

  it("lève une erreur si country_code est invalide", () => {
    expect(() => resolveLocationValues({ lat: 48.85, lon: 2.35, country_code: "fra" })).toThrow(/two-letter country code/);
  });

  it("lève une erreur si params n'est pas un objet", () => {
    expect(() => resolveLocationValues(null)).toThrow(/must be an object/);
  });
});
