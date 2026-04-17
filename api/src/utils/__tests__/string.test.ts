import { describe, expect, it } from "vitest";
import { capitalizeFirstLetter, fuzzyMatchKey, hasLetter, hasNumber, hasSpecialChar, jaccardSimilarity, slugify } from "@/utils/string";

describe("String Utils", () => {
  describe("slugify", () => {
    it("should convert basic strings", () => {
      expect(slugify("hello world")).toBe("hello-world");
    });

    it("should handle special characters", () => {
      expect(slugify("héllo wörld")).toBe("hello-world");
    });

    it("should remove ampersands", () => {
      expect(slugify("apples & oranges")).toBe("apples-oranges");
    });

    it("should replace apostrophes with hyphens", () => {
      expect(slugify("encadrement d'équipes")).toBe("encadrement-d-equipes");
    });

    it("should remove non-word characters except hyphens", () => {
      expect(slugify("hello_world! 123")).toBe("hello-world-123");
    });

    it("should replace multiple hyphens with a single hyphen", () => {
      expect(slugify("hello---world")).toBe("hello-world");
    });

    it("should trim hyphens from start and end", () => {
      expect(slugify("-hello-world-")).toBe("hello-world");
    });

    it("should handle empty string", () => {
      expect(slugify("")).toBe("");
    });
  });

  describe("capitalizeFirstLetter", () => {
    it("should capitalize the first letter of each word", () => {
      expect(capitalizeFirstLetter("hello world")).toBe("Hello World");
    });

    it("should handle single word", () => {
      expect(capitalizeFirstLetter("hello")).toBe("Hello");
    });

    it("should handle already capitalized string", () => {
      expect(capitalizeFirstLetter("Hello World")).toBe("Hello World");
    });

    it("should normalize mixed casing", () => {
      expect(capitalizeFirstLetter("Chambon-La-ForêT")).toBe("Chambon-La-Forêt");
    });

    it("should handle hyphens and apostrophes with accents", () => {
      expect(capitalizeFirstLetter("l'isle-d'abeau")).toBe("L'Isle-d'Abeau");
      expect(capitalizeFirstLetter("saint-étienne")).toBe("Saint-Étienne");
    });

    it("should handle empty string", () => {
      expect(capitalizeFirstLetter("")).toBe("");
    });

    it("should handle string with leading/trailing spaces", () => {
      expect(capitalizeFirstLetter("  hello world  ")).toBe("  Hello World  ");
    });
  });

  describe("hasSpecialChar", () => {
    it("should return true if string contains special characters", () => {
      expect(hasSpecialChar("hello!")).toBe(true);
      expect(hasSpecialChar("world@")).toBe(true);
      expect(hasSpecialChar("#test")).toBe(true);
      expect(hasSpecialChar("a_b")).toBe(false); // underscore is not in the regex
    });

    it("should return false if string does not contain special characters", () => {
      expect(hasSpecialChar("helloworld")).toBe(false);
      expect(hasSpecialChar("hello world")).toBe(false);
      expect(hasSpecialChar("12345")).toBe(false);
    });

    it("should return false for an empty string", () => {
      expect(hasSpecialChar("")).toBe(false);
    });
  });

  describe("hasNumber", () => {
    it("should return true if string contains numbers", () => {
      expect(hasNumber("hello123world")).toBe(true);
      expect(hasNumber("123")).toBe(true);
    });

    it("should return false if string does not contain numbers", () => {
      expect(hasNumber("helloworld")).toBe(false);
      expect(hasNumber("hello world")).toBe(false);
      expect(hasNumber("!@#$")).toBe(false);
    });

    it("should return false for an empty string", () => {
      expect(hasNumber("")).toBe(false);
    });
  });

  describe("jaccardSimilarity", () => {
    it("returns 1.0 for identical keys", () => {
      expect(jaccardSimilarity("sante_social", "sante_social")).toBe(1);
    });

    it("returns 1.0 for reordered tokens", () => {
      expect(jaccardSimilarity("sante_social", "social_sante")).toBe(1);
    });

    it("returns 1.0 despite case differences", () => {
      expect(jaccardSimilarity("Production_construction", "production_construction")).toBe(1);
    });

    it("returns 1.0 despite diacritic differences", () => {
      expect(jaccardSimilarity("qualite_logistique", "qualité_logistique")).toBe(1);
    });

    it("returns 1.0 for reordered tokens with mixed case and diacritics", () => {
      // Simulates: LLM outputs normalized form, taxonomy has legacy casing
      expect(jaccardSimilarity("production_construction_qualite_logistique", "Production_construction_qualité_logistique")).toBe(1);
    });

    it("returns 0 for fully disjoint tokens", () => {
      expect(jaccardSimilarity("sante_social", "culture_arts")).toBe(0);
    });

    it("returns partial score for overlapping tokens", () => {
      // intersection: {sante}, union: {sante, social, soin} → 1/3
      expect(jaccardSimilarity("sante_social", "sante_soin")).toBeCloseTo(1 / 3);
    });
  });

  describe("fuzzyMatchKey", () => {
    const keys = ["sante_social_aide_personne", "education_formation_animation", "culture_creation_medias"];

    it("returns exact match at score 1.0", () => {
      const result = fuzzyMatchKey("sante_social_aide_personne", keys, 0.6);
      expect(result).toEqual({ key: "sante_social_aide_personne", score: 1 });
    });

    it("matches reordered tokens", () => {
      const result = fuzzyMatchKey("social_sante_aide_personne", keys, 0.6);
      expect(result?.key).toBe("sante_social_aide_personne");
      expect(result?.score).toBe(1);
    });

    it("matches despite diacritics and casing", () => {
      const keysWithAccent = ["Production_construction_qualité_logistique"];
      const result = fuzzyMatchKey("production_construction_qualite_logistique", keysWithAccent, 0.6);
      expect(result?.key).toBe("Production_construction_qualité_logistique");
      expect(result?.score).toBe(1);
    });

    it("returns null when best score is below threshold", () => {
      const result = fuzzyMatchKey("numerique_communication", keys, 0.6);
      expect(result).toBeNull();
    });

    it("returns null for empty candidates list", () => {
      const result = fuzzyMatchKey("sante_social", [], 0.6);
      expect(result).toBeNull();
    });

    it("returns the best match among multiple candidates", () => {
      const result = fuzzyMatchKey("formation_education_animation", keys, 0.6);
      expect(result?.key).toBe("education_formation_animation");
    });
  });

  describe("hasLetter", () => {
    it("should return true if string contains letters", () => {
      expect(hasLetter("hello123world")).toBe(true);
      expect(hasLetter("helloworld")).toBe(true);
      expect(hasLetter("Hello World")).toBe(true);
    });

    it("should return false if string does not contain letters", () => {
      expect(hasLetter("12345")).toBe(false);
      expect(hasLetter("!@#$")).toBe(false);
    });

    it("should return false for an empty string", () => {
      expect(hasLetter("")).toBe(false);
    });
  });
});
