import { describe, expect, it } from "vitest";
import { isValidRNA, isValidSiret } from "../organization";

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
