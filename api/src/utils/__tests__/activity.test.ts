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

  describe("known simple slugs", () => {
    it("returns a single slug", () => {
      expect(splitActivityString("animation")).toEqual(["animation"]);
    });

    it("returns two slugs separated by a comma", () => {
      expect(splitActivityString("animation, sport")).toEqual(["animation", "sport"]);
    });

    it("returns two slugs with no space after the comma", () => {
      expect(splitActivityString("animation,sport")).toEqual(["animation", "sport"]);
    });

    it("returns three slugs", () => {
      expect(splitActivityString("animation, sport, art")).toEqual(["animation", "sport", "art"]);
    });
  });

  describe("compound activity preserved as an atomic unit", () => {
    it("each compound label is returned alone without being split", () => {
      for (const label of Object.entries(ACTIVITIES).filter(([slug, label]) => slug !== label).map(([, label]) => label)) {
        expect(splitActivityString(label)).toEqual([label]);
      }
    });
  });

  describe("compound + simple slug — longest-match in action", () => {
    it("compound followed by a known slug", () => {
      expect(splitActivityString("Soutien, Accompagnement, animation")).toEqual(["Soutien, Accompagnement", "animation"]);
    });

    it("known slug preceding a compound", () => {
      expect(splitActivityString("animation, Soutien, Accompagnement")).toEqual(["animation", "Soutien, Accompagnement"]);
    });

    it("known slug sandwiched between two compounds", () => {
      expect(splitActivityString("Soutien, Accompagnement, animation, Secours, Aide")).toEqual([
        "Soutien, Accompagnement",
        "animation",
        "Secours, Aide",
      ]);
    });

    it("compound followed by an unknown token", () => {
      expect(splitActivityString("Transmission, Pédagogie, Animation")).toEqual(["Transmission, Pédagogie", "Animation"]);
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

    it("unknown token before a known slug", () => {
      expect(splitActivityString("Inconnu, animation")).toEqual(["Inconnu", "animation"]);
    });

    it("unknown token after a known slug", () => {
      expect(splitActivityString("animation, Inconnu")).toEqual(["animation", "Inconnu"]);
    });

    it("unknown token between two known slugs", () => {
      expect(splitActivityString("animation, Inconnu, sport")).toEqual(["animation", "Inconnu", "sport"]);
    });

    it("unknown token before a compound", () => {
      expect(splitActivityString("Inconnu, Soutien, Accompagnement")).toEqual(["Inconnu", "Soutien, Accompagnement"]);
    });
  });

  describe("whitespace and stray commas", () => {
    it("trims leading and trailing spaces from the input", () => {
      expect(splitActivityString("  animation  ")).toEqual(["animation"]);
    });

    it("handles a space before the separator comma", () => {
      expect(splitActivityString("animation , sport")).toEqual(["animation", "sport"]);
    });

    it("ignores a leading comma", () => {
      expect(splitActivityString(", animation")).toEqual(["animation"]);
    });

    it("ignores a trailing comma", () => {
      expect(splitActivityString("animation,")).toEqual(["animation"]);
    });

    it("ignores consecutive commas", () => {
      expect(splitActivityString("animation,, sport")).toEqual(["animation", "sport"]);
    });
  });

  describe("case sensitivity", () => {
    it("lowercase 'animation' matches the slug, not the start of compound 'Animation, Valorisation'", () => {
      expect(splitActivityString("animation, Valorisation")).toEqual(["animation", "Valorisation"]);
    });

    it("capitalized 'Animation, Valorisation' matches the compound", () => {
      expect(splitActivityString("Animation, Valorisation")).toEqual(["Animation, Valorisation"]);
    });
  });

  describe("missing internal space in compound", () => {
    it("'Soutien,Accompagnement' without the space does not match the compound — split into two tokens", () => {
      expect(splitActivityString("Soutien,Accompagnement")).toEqual(["Soutien", "Accompagnement"]);
    });
  });
});
