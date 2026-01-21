import { describe, expect, it } from "vitest";

import { parseBool, parseCompensationUnit, parseDate, parseNumber, parseRemote, parseStringArray } from "../mission";

describe("import-missions parsing helpers", () => {
  describe("parseStringArray", () => {
    it("returns undefined for empty values", () => {
      expect(parseStringArray(undefined)).toBeUndefined();
      expect(parseStringArray(null)).toBeUndefined();
      expect(parseStringArray("")).toBeUndefined();
    });

    it("normalizes array values", () => {
      expect(parseStringArray([" a ", "", null, "b"])).toEqual(["a", "b"]);
    });

    it("splits only on commas", () => {
      expect(parseStringArray("a, b ,c")).toEqual(["a", "b", "c"]);
      expect(parseStringArray("Affinite pour la technique")).toEqual(["Affinite pour la technique"]);
    });
  });

  describe("parseDate", () => {
    it("parses dates without timezone as UTC", () => {
      const parsed = parseDate("2024-01-02T03:04:05");
      expect(parsed?.toISOString()).toBe("2024-01-02T03:04:05.000Z");
    });

    it("returns null for invalid dates", () => {
      expect(parseDate("not-a-date")).toBeNull();
    });
  });

  describe("parseNumber", () => {
    it("parses numeric values and rejects invalid ones", () => {
      expect(parseNumber("10")).toBe(10);
      expect(parseNumber("foo")).toBeNull();
      expect(parseNumber("")).toBeNull();
    });
  });

  describe("parseBool", () => {
    it("parses string values", () => {
      expect(parseBool("yes")).toBe(true);
      expect(parseBool("false")).toBe(false);
      expect(parseBool("0")).toBe(false);
    });

    it("returns null for nullish values", () => {
      expect(parseBool(null)).toBeNull();
      expect(parseBool(undefined)).toBeNull();
    });
  });

  describe("parseRemote", () => {
    it("maps remote values to expected enums", () => {
      expect(parseRemote("full")).toBe("full");
      expect(parseRemote("oui")).toBe("possible");
      expect(parseRemote("non")).toBe("no");
    });
  });

  describe("parseCompensationUnit", () => {
    it("maps compensation units", () => {
      expect(parseCompensationUnit("heures")).toBe("hour");
      expect(parseCompensationUnit("annee")).toBe("year");
      expect(parseCompensationUnit("invalid")).toBeNull();
    });
  });
});
