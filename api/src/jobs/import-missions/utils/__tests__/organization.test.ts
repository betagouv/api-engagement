import { describe, expect, it } from "vitest";
import { getDepartement, isVerified } from "../organization";

describe("isVerified", () => {
  it("should return true for verified status missions", () => {
    expect(isVerified({ organizationVerificationStatus: "RNA_MATCHED_WITH_DATA_DB" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "RNA_MATCHED_WITH_DATA_SUBVENTION" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "SIRET_MATCHED_WITH_DATA_DB" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "SIRET_MATCHED_WITH_DATA_SUBVENTION" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "NAME_EXACT_MATCHED_WITH_DB" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "NAME_APPROXIMATE_MATCHED_WITH_DB" })).toBe(true);
    expect(isVerified({ organizationVerificationStatus: "NO_DATA" })).toBe(true);
  });
  it("should return false for unverified status missions", () => {
    expect(isVerified({ organizationVerificationStatus: "RNA_NOT_MATCHED" })).toBe(false);
    expect(isVerified({ organizationVerificationStatus: "SIRET_NOT_MATCHED" })).toBe(false);
    expect(isVerified({ organizationVerificationStatus: "NAME_NOT_MATCHED" })).toBe(false);
  });
  it("should return false for unknown status missions", () => {
    expect(isVerified({ organizationVerificationStatus: undefined })).toBe(false);
    expect(isVerified({ organizationVerificationStatus: "UNKNOWN" })).toBe(false);
  });
});

describe("getDepartement", () => {
  it("should return null for empty postal code", () => {
    expect(getDepartement("")).toBe(null);
  });
  it("should return null for unknown postal code", () => {
    expect(getDepartement("999")).toBe(null);
  });
  it("should return valid department for valid postal code", () => {
    expect(getDepartement("75")).toEqual({ code: "75", name: "Paris", region: "Île-de-France" });
  });
});
