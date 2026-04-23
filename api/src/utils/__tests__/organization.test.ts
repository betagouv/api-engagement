import { buildOrganizationPrefixTsQuery, buildOrganizationSearchText, isValidRNA, isValidSiret, normalizeOrganizationSearchQuery, tokenizeOrganizationSearchQuery } from "@/utils/organization";
import { describe, expect, it } from "vitest";

describe("isValidRNA", () => {
  it("should return true for valid RNAs", () => {
    expect(isValidRNA("W123456789")).toBe(true);
  });
  it("should return false for RNA with invalid format", () => {
    expect(isValidRNA("123456789")).toBe(false);
  });
  it("should return false for RNA with invalid length", () => {
    expect(isValidRNA("W12345678")).toBe(false);
  });
});

describe("isValidSiret", () => {
  it("should return true for valid SIRETs", () => {
    expect(isValidSiret("12345678901234")).toBe(true);
  });
  it("should return false for SIRET with invalid format", () => {
    expect(isValidSiret("1234567890123")).toBe(false);
  });
  it("should return false for SIRET with invalid length", () => {
    expect(isValidSiret("123456789012")).toBe(false);
  });
});

describe("buildOrganizationSearchText", () => {
  it("should return null when both inputs are empty", () => {
    expect(buildOrganizationSearchText({ title: "   ", shortTitle: null })).toBeNull();
  });

  it("should build a trimmed, collapsed string from title only", () => {
    expect(buildOrganizationSearchText({ title: "  Croix   Rouge  ", shortTitle: undefined })).toBe("croix rouge");
  });

  it("should concatenate title and short title with a single space", () => {
    expect(buildOrganizationSearchText({ title: "Croix Rouge", shortTitle: "  CR  " })).toBe("croix rouge cr");
  });

  it("should include identifiers in search text", () => {
    expect(buildOrganizationSearchText({ title: "Croix Rouge", rna: "W123456789", siret: "12345678901234", siren: "123456789" })).toBe(
      "croix rouge w123456789 12345678901234 123456789"
    );
  });

  it("should remove accents and punctuation from search text", () => {
    expect(buildOrganizationSearchText({ title: "Association des étudiants !", shortTitle: "A.É." })).toBe("association des etudiants a e");
  });
});

describe("normalizeOrganizationSearchQuery", () => {
  it("should normalize accents, punctuation and spaces", () => {
    expect(normalizeOrganizationSearchQuery("  Association des étudiants !  ")).toBe("association des etudiants");
  });

  it("should return null when nothing searchable remains", () => {
    expect(normalizeOrganizationSearchQuery(" !!! ")).toBeNull();
  });
});

describe("tokenizeOrganizationSearchQuery", () => {
  it("should keep unique tokens with a minimum length", () => {
    expect(tokenizeOrganizationSearchQuery("Association des étudiants des")).toEqual(["association", "des", "etudiants"]);
  });
});

describe("buildOrganizationPrefixTsQuery", () => {
  it("should build a prefix tsquery from normalized tokens", () => {
    expect(buildOrganizationPrefixTsQuery("Association des étudiants")).toBe("association:* & des:* & etudiants:*");
  });

  it("should return null when no token meets the minimum length", () => {
    expect(buildOrganizationPrefixTsQuery("a l")).toBeNull();
  });
});
