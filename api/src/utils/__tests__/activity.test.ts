import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "../../constants/activity";
import { splitActivityString } from "../activity";

describe("splitActivityString", () => {
  describe("empty inputs", () => {
    it("returns an empty array for an empty string", () => {
      expect(splitActivityString("")).toEqual([]);
    });

    it("returns an empty array for a whitespace-only string", () => {
      expect(splitActivityString("   ")).toEqual([]);
    });

    it("returns an empty array for nullish values", () => {
      expect(splitActivityString(undefined as any)).toEqual([]);
      expect(splitActivityString(null as any)).toEqual([]);
    });

    it("returns an empty array for bare commas with no content", () => {
      expect(splitActivityString(",")).toEqual([]);
      expect(splitActivityString(", ,")).toEqual([]);
      expect(splitActivityString(" , , ")).toEqual([]);
    });
  });

  describe("slugs normalise to labels", () => {
    it("a single slug normalises to its label", () => {
      expect(splitActivityString("animation")).toEqual(["Animation"]);
    });

    it("two slugs normalise to their labels", () => {
      expect(splitActivityString("animation, sport")).toEqual(["Animation", "Sport"]);
    });

    it("two slugs with no space after the comma", () => {
      expect(splitActivityString("animation,sport")).toEqual(["Animation", "Sport"]);
    });

    it("three slugs normalise to their labels", () => {
      expect(splitActivityString("animation, sport, art")).toEqual(["Animation", "Sport", "Art"]);
    });

    it("every slug in the whitelist normalises to its label", () => {
      for (const [slug, label] of Object.entries(ACTIVITIES)) {
        expect(splitActivityString(slug)).toEqual([label]);
      }
    });
  });

  describe("labels are returned unchanged", () => {
    it("every label in the whitelist is returned as-is", () => {
      for (const label of Object.values(ACTIVITIES)) {
        expect(splitActivityString(label)).toEqual([label]);
      }
    });
  });

  describe("compound + slug — longest-match in action", () => {
    it("compound followed by a slug", () => {
      expect(splitActivityString("Soutien, Accompagnement, animation")).toEqual(["Soutien, Accompagnement", "Animation"]);
    });

    it("slug preceding a compound", () => {
      expect(splitActivityString("animation, Soutien, Accompagnement")).toEqual(["Animation", "Soutien, Accompagnement"]);
    });

    it("slug sandwiched between two compounds", () => {
      expect(splitActivityString("Soutien, Accompagnement, animation, Secours, Aide")).toEqual([
        "Soutien, Accompagnement",
        "Animation",
        "Secours, Aide",
      ]);
    });

    it("compound followed by a label", () => {
      expect(splitActivityString("Transmission, Pédagogie, Animation")).toEqual(["Transmission, Pédagogie", "Animation"]);
    });

    it("compound slug followed by a label", () => {
      expect(splitActivityString("transmission-pedagogie, Animation")).toEqual(["Transmission, Pédagogie", "Animation"]);
    });
  });

  describe("consecutive compounds", () => {
    it("two compounds separated by comma-space", () => {
      expect(splitActivityString("Soutien, Accompagnement, Transmission, Pédagogie")).toEqual([
        "Soutien, Accompagnement",
        "Transmission, Pédagogie",
      ]);
    });

    it("two compounds separated by comma without space between them", () => {
      expect(splitActivityString("Soutien, Accompagnement,Transmission, Pédagogie")).toEqual([
        "Soutien, Accompagnement",
        "Transmission, Pédagogie",
      ]);
    });

    it("three compounds in a row", () => {
      expect(splitActivityString("Soutien, Accompagnement, Transmission, Pédagogie, Secours, Aide")).toEqual([
        "Soutien, Accompagnement",
        "Transmission, Pédagogie",
        "Secours, Aide",
      ]);
    });
  });

  describe("unknown activities passed through as-is", () => {
    it("single unknown token", () => {
      expect(splitActivityString("Inconnu")).toEqual(["Inconnu"]);
    });

    it("unknown token before a slug", () => {
      expect(splitActivityString("Inconnu, animation")).toEqual(["Inconnu", "Animation"]);
    });

    it("unknown token after a slug", () => {
      expect(splitActivityString("animation, Inconnu")).toEqual(["Animation", "Inconnu"]);
    });

    it("unknown token between two slugs", () => {
      expect(splitActivityString("animation, Inconnu, sport")).toEqual(["Animation", "Inconnu", "Sport"]);
    });

    it("unknown token before a compound", () => {
      expect(splitActivityString("Inconnu, Soutien, Accompagnement")).toEqual(["Inconnu", "Soutien, Accompagnement"]);
    });
  });

  describe("whitespace and stray commas", () => {
    it("trims leading and trailing spaces from the input", () => {
      expect(splitActivityString("  animation  ")).toEqual(["Animation"]);
    });

    it("handles a space before the separator comma", () => {
      expect(splitActivityString("animation , sport")).toEqual(["Animation", "Sport"]);
    });

    it("ignores a leading comma", () => {
      expect(splitActivityString(", animation")).toEqual(["Animation"]);
    });

    it("ignores a trailing comma", () => {
      expect(splitActivityString("animation,")).toEqual(["Animation"]);
    });

    it("ignores consecutive commas", () => {
      expect(splitActivityString("animation,, sport")).toEqual(["Animation", "Sport"]);
    });
  });

  describe("case sensitivity", () => {
    it("lowercase slug 'animation' does not match compound 'Animation, Valorisation'", () => {
      expect(splitActivityString("animation, Valorisation")).toEqual(["Animation", "Valorisation"]);
    });

    it("capitalized 'Animation, Valorisation' matches the compound label", () => {
      expect(splitActivityString("Animation, Valorisation")).toEqual(["Animation, Valorisation"]);
    });
  });

  describe("missing internal space in compound", () => {
    it("'Soutien,Accompagnement' without the space does not match the compound — split into two unknown tokens", () => {
      expect(splitActivityString("Soutien,Accompagnement")).toEqual(["Soutien", "Accompagnement"]);
    });
  });
});
