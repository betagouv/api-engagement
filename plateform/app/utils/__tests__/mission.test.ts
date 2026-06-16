import { describe, expect, it } from "vitest";
import { formatCompensation, formatMissionType, formatStartDate } from "../mission";

describe("formatStartDate", () => {
  it("retourne null si startAt et duration sont tous les deux null", () => {
    expect(formatStartDate(null, null)).toBeNull();
  });

  it("retourne seulement la durée si startAt est null", () => {
    expect(formatStartDate(null, 6)).toBe("6 mois");
  });

  it("retourne seulement la date si duration est null", () => {
    expect(formatStartDate("2025-09-01T00:00:00.000Z", null)).toBe("À partir du 1 septembre");
  });

  it("combine durée et date", () => {
    expect(formatStartDate("2025-09-01T00:00:00.000Z", 3)).toBe("3 mois à partir du 1 septembre");
  });
});

describe("formatCompensation", () => {
  it("retourne null si amount est null", () => {
    expect(formatCompensation({ amount: null, amountMax: null, unit: null, type: null })).toBeNull();
  });

  it("formate un montant simple", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: null })).toBe("1000€");
  });

  it("formate une plage de montants", () => {
    expect(formatCompensation({ amount: 1000, amountMax: 1500, unit: null, type: null })).toBe("Entre 1000 et 1500€");
    expect(formatCompensation({ amount: 600, amountMax: 800, unit: "month", type: null })).toBe("Entre 600 et 800€ par mois");
  });

  it("ignore le type par défaut", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" })).toBe("1000€");
  });

  it("inclut le type (brut/net) avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" }, { withType: true })).toBe("1000€ net");
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "gross" }, { withType: true })).toBe("1000€ brut");
  });

  it("inclut l'unité", () => {
    expect(formatCompensation({ amount: 500, amountMax: null, unit: "month", type: null })).toBe("500€ par mois");
    expect(formatCompensation({ amount: 12, amountMax: null, unit: "hour", type: null })).toBe("12€ par heure");
  });

  it("combine montant, type et unité avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: "month", type: "net" }, { withType: true })).toBe("1000€ net par mois");
  });

  it("préserve les unités inconnues telles quelles", () => {
    expect(formatCompensation({ amount: 100, amountMax: null, unit: "custom_unit", type: null })).toBe("100€ par custom_unit");
  });
});

describe("formatMissionType", () => {
  it('retourne "Mission" si le type est null', () => {
    expect(formatMissionType(null)).toBe("Mission");
  });

  it("retourne le label correspondant", () => {
    expect(formatMissionType("benevolat")).toBe("Mission de bénévolat");
    expect(formatMissionType("volontariat_service_civique")).toBe("Mission de Service Civique");
    expect(formatMissionType("emploi")).toBe("Emploi");
    expect(formatMissionType("stage")).toBe("Stage");
  });

  it('retourne "Mission" pour un type inconnu', () => {
    expect(formatMissionType("type_inconnu")).toBe("Mission");
  });
});
