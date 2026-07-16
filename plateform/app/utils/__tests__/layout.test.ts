import { describe, expect, it } from "vitest";
import { hasFooterTarget, isGlobalFooterVisible } from "../layout";

describe("isGlobalFooterVisible", () => {
  it("affiche le footer global sur les pages standard", () => {
    expect(isGlobalFooterVisible("/", false)).toBe(true);
    expect(isGlobalFooterVisible("/", true)).toBe(true);
    expect(isGlobalFooterVisible("/missions", true)).toBe(true);
  });

  it("masque le footer global sur le parcours quiz", () => {
    expect(isGlobalFooterVisible("/quiz", false)).toBe(false);
    expect(isGlobalFooterVisible("/quiz/age", true)).toBe(false);
  });

  it("masque le footer global sur /results uniquement en mobile (la route rend son propre footer)", () => {
    expect(isGlobalFooterVisible("/results/abc", true)).toBe(false);
    expect(isGlobalFooterVisible("/results/abc", false)).toBe(true);
  });
});

describe("hasFooterTarget", () => {
  it("expose une cible #footer sur les pages standard", () => {
    expect(hasFooterTarget("/")).toBe(true);
    expect(hasFooterTarget("/missions")).toBe(true);
    expect(hasFooterTarget("/accessibilite")).toBe(true);
  });

  it("expose une cible #footer sur /results (footer global desktop ou footer local mobile)", () => {
    expect(hasFooterTarget("/results/abc")).toBe(true);
  });

  it("n'expose pas de cible #footer sur le quiz", () => {
    expect(hasFooterTarget("/quiz")).toBe(false);
    expect(hasFooterTarget("/quiz/age")).toBe(false);
  });
});
