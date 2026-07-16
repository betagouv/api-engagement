import { describe, expect, it } from "vitest";
import { isFooterVisible } from "../layout";

describe("isFooterVisible", () => {
  it("affiche le footer sur les pages standard", () => {
    expect(isFooterVisible("/", false)).toBe(true);
    expect(isFooterVisible("/", true)).toBe(true);
    expect(isFooterVisible("/missions", true)).toBe(true);
    expect(isFooterVisible("/accessibilite", true)).toBe(true);
  });

  it("masque le footer sur le parcours quiz (desktop et mobile)", () => {
    expect(isFooterVisible("/quiz", false)).toBe(false);
    expect(isFooterVisible("/quiz", true)).toBe(false);
    expect(isFooterVisible("/quiz/age", false)).toBe(false);
  });

  it("masque le footer sur /results uniquement en mobile", () => {
    expect(isFooterVisible("/results/abc", true)).toBe(false);
    expect(isFooterVisible("/results/abc", false)).toBe(true);
  });
});
