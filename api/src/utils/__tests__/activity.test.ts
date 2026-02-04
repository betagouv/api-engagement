import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "../../constants/activity";
import { isWhitelistedActivity, splitActivityString } from "../activity";

describe("splitActivityString", () => {
  it("returns [] for empty, whitespace, nullish and bare commas", () => {
    expect(splitActivityString("")).toEqual([]);
    expect(splitActivityString("   ")).toEqual([]);
    expect(splitActivityString(undefined as any)).toEqual([]);
    expect(splitActivityString(null as any)).toEqual([]);
    expect(splitActivityString(", ,")).toEqual([]);
  });

  it("every slug in ACTIVITIES normalises to its label", () => {
    for (const [slug, label] of Object.entries(ACTIVITIES)) {
      expect(splitActivityString(slug)).toEqual([label]);
    }
  });

  it("every label in ACTIVITIES is returned as-is", () => {
    for (const label of Object.values(ACTIVITIES)) {
      expect(splitActivityString(label)).toEqual([label]);
    }
  });

  it("parses multiple comma-separated slugs", () => {
    expect(splitActivityString("animation, sport, art")).toEqual(["Animation", "Sport", "Art"]);
    expect(splitActivityString("animation,sport")).toEqual(["Animation", "Sport"]);
  });

  it("preserves compound activities via longest-match", () => {
    expect(splitActivityString("Soutien, Accompagnement, animation")).toEqual(["Soutien, Accompagnement", "Animation"]);
    expect(splitActivityString("animation, Soutien, Accompagnement")).toEqual(["Animation", "Soutien, Accompagnement"]);
  });

  it("resolves compound slugs to their compound label", () => {
    expect(splitActivityString("transmission-pedagogie, Animation")).toEqual(["Transmission, Pédagogie", "Animation"]);
  });

  it("handles consecutive compounds", () => {
    expect(splitActivityString("Soutien, Accompagnement, Transmission, Pédagogie, Secours, Aide")).toEqual([
      "Soutien, Accompagnement",
      "Transmission, Pédagogie",
      "Secours, Aide",
    ]);
  });

  it("passes unknown tokens through, even adjacent to compounds", () => {
    expect(splitActivityString("Inconnu, Soutien, Accompagnement")).toEqual(["Inconnu", "Soutien, Accompagnement"]);
  });

  it("slugifies unknown tokens before lookup — ampersand and apostrophe", () => {
    expect(splitActivityString("Mentorat & Parrainage")).toEqual(["Mentorat parrainage"]);
    expect(splitActivityString("Soutien & Accompagnement")).toEqual(["Soutien, Accompagnement"]);
    expect(splitActivityString("Encadrement d'Équipes")).toEqual(["Encadrement d'équipes"]);
  });

  it("unknown tokens with special characters pass through unchanged", () => {
    expect(splitActivityString("Foo & Bar")).toEqual(["Foo & Bar"]);
  });

  it("case matters: 'animation, Valorisation' ≠ 'Animation, Valorisation'", () => {
    expect(splitActivityString("animation, Valorisation")).toEqual(["Animation", "Valorisation"]);
    expect(splitActivityString("Animation, Valorisation")).toEqual(["Animation, Valorisation"]);
  });

  it("missing internal space in compound prevents compound match", () => {
    expect(splitActivityString("Soutien,Accompagnement")).toEqual(["Soutien", "Accompagnement"]);
  });
});

describe("isWhitelistedActivity", () => {
  it("returns true for known slugs and labels", () => {
    expect(isWhitelistedActivity("animation")).toBe(true);
    expect(isWhitelistedActivity("Animation")).toBe(true);
    expect(isWhitelistedActivity("soutien-accompagnement")).toBe(true);
    expect(isWhitelistedActivity("Soutien, Accompagnement")).toBe(true);
  });

  it("returns false for unknown names", () => {
    expect(isWhitelistedActivity("Inconnu")).toBe(false);
    expect(isWhitelistedActivity("")).toBe(false);
  });
});
