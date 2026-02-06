import { describe, expect, it } from "vitest";

import { hasEncodageIssue, parseBool, parseDate, parseLowercase, parseNumber, parseSiren, parseString, parseStringArray } from "../helpers";

// ---------------------------------------------------------------------------
// parseString
// ---------------------------------------------------------------------------

describe("parseString", () => {
  it("returns empty string for undefined", () => {
    expect(parseString(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(parseString("")).toBe("");
  });

  it("returns the string value as-is", () => {
    expect(parseString("hello")).toBe("hello");
  });

  it("converts non-empty values via String()", () => {
    expect(parseString("123")).toBe("123");
  });
});

// ---------------------------------------------------------------------------
// parseStringArray
// ---------------------------------------------------------------------------

describe("parseStringArray", () => {
  it("returns undefined for undefined", () => {
    expect(parseStringArray(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseStringArray(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseStringArray("")).toBeUndefined();
  });

  it("normalizes array values and filters empty/null entries", () => {
    expect(parseStringArray([" a ", "", null, "b"])).toEqual(["a", "b"]);
  });

  it("returns undefined for an array of only empty values", () => {
    expect(parseStringArray(["", " ", null])).toBeUndefined();
  });

  it("splits comma-separated strings", () => {
    expect(parseStringArray("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("does not split strings without commas", () => {
    expect(parseStringArray("Affinite pour la technique")).toEqual(["Affinite pour la technique"]);
  });

  it("filters empty values from comma-separated strings", () => {
    expect(parseStringArray("a, , b, ")).toEqual(["a", "b"]);
  });

  it("returns undefined for a blank string after trim", () => {
    expect(parseStringArray("   ")).toBeUndefined();
  });

  it("handles object with value property (array)", () => {
    expect(parseStringArray({ value: ["x", "y"] })).toEqual(["x", "y"]);
  });

  it("handles object with value property (string)", () => {
    expect(parseStringArray({ value: "a, b" })).toEqual(["a", "b"]);
  });

  it("handles object with item property", () => {
    expect(parseStringArray({ item: ["i1", "i2"] })).toEqual(["i1", "i2"]);
  });

  it("returns undefined for an unknown object shape", () => {
    expect(parseStringArray({ other: "stuff" })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseSiren
// ---------------------------------------------------------------------------

describe("parseSiren", () => {
  it("returns null siren and siret for empty value", () => {
    expect(parseSiren("")).toEqual({ siret: null, siren: null });
  });

  it("returns null siren and siret for undefined", () => {
    expect(parseSiren(undefined)).toEqual({ siret: null, siren: null });
  });

  it("parses valid SIRET (14 digits) and extracts SIREN", () => {
    expect(parseSiren("12345678901234")).toEqual({ siret: "12345678901234", siren: "123456789" });
  });

  it("parses valid SIREN (9 digits) without SIRET", () => {
    expect(parseSiren("123456789")).toEqual({ siren: "123456789", siret: null });
  });

  it("returns null for invalid value (non-numeric)", () => {
    expect(parseSiren("invalid")).toEqual({ siret: null, siren: null });
  });

  it("returns null for value with wrong length", () => {
    expect(parseSiren("12345")).toEqual({ siret: null, siren: null });
  });

  it("returns null for SIREN with non-numeric characters", () => {
    expect(parseSiren("12345678A")).toEqual({ siret: null, siren: null });
  });
});

// ---------------------------------------------------------------------------
// parseBool
// ---------------------------------------------------------------------------

describe("parseBool", () => {
  it("returns true for 'yes'", () => {
    expect(parseBool("yes")).toBe(true);
  });

  it("returns true for 'true'", () => {
    expect(parseBool("true")).toBe(true);
  });

  it("returns true for '1'", () => {
    expect(parseBool("1")).toBe(true);
  });

  it("returns false for 'false'", () => {
    expect(parseBool("false")).toBe(false);
  });

  it("returns false for '0'", () => {
    expect(parseBool("0")).toBe(false);
  });

  it("returns false for 'no'", () => {
    expect(parseBool("no")).toBe(false);
  });

  it("returns false for an unrecognized string", () => {
    expect(parseBool("maybe")).toBe(false);
  });

  it("returns true for boolean true", () => {
    expect(parseBool(true)).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(parseBool(false)).toBe(false);
  });

  it("returns null for null", () => {
    expect(parseBool(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseBool(undefined)).toBeNull();
  });

  it("trims and lowercases input", () => {
    expect(parseBool("  YES  ")).toBe(true);
    expect(parseBool("  True  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------

describe("parseDate", () => {
  it("returns null for undefined", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("parses date string without timezone as UTC", () => {
    const parsed = parseDate("2024-01-02T03:04:05");
    expect(parsed?.toISOString()).toBe("2024-01-02T03:04:05.000Z");
  });

  it("parses date string with Z timezone designator", () => {
    const parsed = parseDate("2024-06-15T12:00:00Z");
    expect(parsed?.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("parses date string with offset timezone", () => {
    const parsed = parseDate("2024-06-15T12:00:00+02:00");
    expect(parsed?.toISOString()).toBe("2024-06-15T10:00:00.000Z");
  });

  it("parses a Date object directly", () => {
    const date = new Date("2024-03-01T00:00:00Z");
    expect(parseDate(date)).toBe(date);
  });

  it("parses a simple date string (YYYY-MM-DD) as UTC", () => {
    const parsed = parseDate("2024-07-20");
    expect(parsed).not.toBeNull();
    expect(parsed?.getUTCFullYear()).toBe(2024);
    expect(parsed?.getUTCMonth()).toBe(6); // July = 6
    expect(parsed?.getUTCDate()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------

describe("parseNumber", () => {
  it("parses numeric string", () => {
    expect(parseNumber("10")).toBe(10);
  });

  it("parses a number directly", () => {
    expect(parseNumber(42)).toBe(42);
  });

  it("parses zero", () => {
    expect(parseNumber(0)).toBe(0);
  });

  it("parses string zero", () => {
    expect(parseNumber("0")).toBe(0);
  });

  it("parses float string", () => {
    expect(parseNumber("3.14")).toBeCloseTo(3.14);
  });

  it("returns null for non-numeric string", () => {
    expect(parseNumber("foo")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseNumber("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseNumber(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseNumber(null as unknown as undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseLowercase
// ---------------------------------------------------------------------------

describe("parseLowercase", () => {
  it("returns lowercased string", () => {
    expect(parseLowercase("Hello")).toBe("hello");
  });

  it("returns null for empty string", () => {
    expect(parseLowercase("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseLowercase(undefined)).toBeNull();
  });

  it("lowercases all characters", () => {
    expect(parseLowercase("UPPERCASE")).toBe("uppercase");
  });

  it("handles mixed case", () => {
    expect(parseLowercase("MiXeD CaSe")).toBe("mixed case");
  });
});

// ---------------------------------------------------------------------------
// hasEncodageIssue
// ---------------------------------------------------------------------------

describe("hasEncodageIssue", () => {
  it("returns true when string contains '&#'", () => {
    expect(hasEncodageIssue("Hello &#224; World")).toBe(true);
  });

  it("returns false for clean string", () => {
    expect(hasEncodageIssue("Hello World")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasEncodageIssue("")).toBe(false);
  });

  it("returns false for undefined (default empty string)", () => {
    expect(hasEncodageIssue()).toBe(false);
  });

  it("detects double-encoded entities", () => {
    expect(hasEncodageIssue("&#38;")).toBe(true);
  });
});
