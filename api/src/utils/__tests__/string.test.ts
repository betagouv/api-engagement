import { describe, expect, it } from "vitest";
import { capitalizeFirstLetter, hasLetter, hasNumber, hasSpecialChar, slugify } from "../string";

describe("String Utils", () => {
  describe("slugify", () => {
    it("should convert basic strings", () => {
      expect(slugify("hello world")).toBe("hello-world");
    });

    it("should handle special characters", () => {
      expect(slugify("héllo wörld")).toBe("hello-world");
    });

    it("should replace ampersands", () => {
      expect(slugify("apples & oranges")).toBe("apples-and-oranges");
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
