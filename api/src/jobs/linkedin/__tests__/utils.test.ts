import { describe, expect, it, vi } from "vitest";

// Mock S3 service before import to avoid credentials error on launch
vi.mock("../../../services/s3", () => ({
  default: {},
}));

import { getAudienceLabel, getDomainLabel } from "../utils";

describe("getDomainLabel", () => {
  it("should return the domain label", () => {
    expect(getDomainLabel("animaux")).toBe("🐶 Protection des animaux");
    expect(getDomainLabel("autre")).toBe("🎯 Missions sur-mesure");
    expect(getDomainLabel("benevolat-competences")).toBe("💼 Bénévolat de compétences");
    expect(getDomainLabel("culture-loisirs")).toBe("🎨 Arts & culture pour tous");
    expect(getDomainLabel("education")).toBe("📚 Éducation pour tous");
    expect(getDomainLabel("emploi")).toBe("💼 Emploi");
    expect(getDomainLabel("environnement")).toBe("🌿 Protection de la nature");
    expect(getDomainLabel("humanitaire")).toBe("🕊️ Humanitaire");
    expect(getDomainLabel("memoire-et-citoyennete")).toBe("📯 Mémoire et citoyenneté");
    expect(getDomainLabel("prevention-protection")).toBe("🚨 Prévention & Protection");
    expect(getDomainLabel("sante")).toBe("💊 Santé pour tous");
    expect(getDomainLabel("sport")).toBe("🏀 Sport pour tous");
    expect(getDomainLabel("solidarite-insertion")).toBe("🍜 Solidarité et insertion");
    expect(getDomainLabel("vivre-ensemble")).toBe("🌍 Coopération internationale");
  });

  it("should return the default domain label", () => {
    expect(getDomainLabel("unknown")).toBe("🎯 Missions sur-mesure");
  });
});

describe("getAudienceLabel", () => {
  it("should return the audience label", () => {
    expect(getAudienceLabel("seniors")).toBe("Personnes âgées");
    expect(getAudienceLabel("persons_with_disabilities")).toBe("Personnes en situation de handicap");
    expect(getAudienceLabel("people_in_difficulty")).toBe("Personnes en difficulté");
    expect(getAudienceLabel("parents")).toBe("Parents");
    expect(getAudienceLabel("children")).toBe("Jeunes / enfants");
    expect(getAudienceLabel("public_refugees")).toBe("Nouveaux arrivants / Réfugiées");
    expect(getAudienceLabel("people_being_excluded")).toBe("Personnes en situation d'exclusion");
    expect(getAudienceLabel("people_sick")).toBe("Personnes malades");
    expect(getAudienceLabel("any_public")).toBe("Tous publics");
  });

  it("should return the default audience label", () => {
    expect(getAudienceLabel("unknown")).toBe("Tous publics");
  });
});
