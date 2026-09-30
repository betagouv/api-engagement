import { describe, expect, it } from "vitest";
import { hasMobileFixedBottomBar, isGlobalFooterVisible } from "../layout";

describe("isGlobalFooterVisible", () => {
  it("affiche le footer global sur les pages standard", () => {
    expect(isGlobalFooterVisible("/", false)).toBe(true);
    expect(isGlobalFooterVisible("/", true)).toBe(true);
    expect(isGlobalFooterVisible("/missions", true)).toBe(true);
  });

  it("affiche le footer global sur le parcours quiz", () => {
    expect(isGlobalFooterVisible("/quiz", false)).toBe(true);
    expect(isGlobalFooterVisible("/quiz/age", true)).toBe(true);
  });

  it("masque le footer global sur /results uniquement en mobile (la route rend son propre footer)", () => {
    expect(isGlobalFooterVisible("/results/abc", true)).toBe(false);
    expect(isGlobalFooterVisible("/results/abc", false)).toBe(true);
  });

  it("affiche le footer global sur la fiche mission ouverte depuis les résultats, en mobile", () => {
    expect(isGlobalFooterVisible("/results/abc/missions/xyz", true)).toBe(true);
  });
});

describe("hasMobileFixedBottomBar", () => {
  it("détecte les fiches mission", () => {
    expect(hasMobileFixedBottomBar("/missions/xyz")).toBe(true);
    expect(hasMobileFixedBottomBar("/results/abc/missions/xyz")).toBe(true);
  });

  it("ignore les autres pages", () => {
    expect(hasMobileFixedBottomBar("/")).toBe(false);
    expect(hasMobileFixedBottomBar("/quiz/age")).toBe(false);
    expect(hasMobileFixedBottomBar("/missions")).toBe(false);
    expect(hasMobileFixedBottomBar("/results/abc")).toBe(false);
  });
});
