import { describe, expect, it } from "vitest";
import { DEFAULT_PARCOURS_VERSION, PARCOURS_REGISTRY, resolveParcours } from "../parcours";

describe("resolveParcours", () => {
  it("résout un parcours valide", () => {
    expect(resolveParcours("p1")).toBe(PARCOURS_REGISTRY.p1);
  });

  it("retombe sur le défaut si absent ou inconnu", () => {
    const fallback = PARCOURS_REGISTRY[DEFAULT_PARCOURS_VERSION];
    expect(resolveParcours(undefined)).toBe(fallback);
    expect(resolveParcours("nope")).toBe(fallback);
  });
});
