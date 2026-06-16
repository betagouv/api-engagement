import { describe, expect, it } from "vitest";
import { type GeoPosition, getNearbyPosition } from "../geo";

describe("getNearbyPosition", () => {
  it("retourne toujours la même position pour les mêmes entrées", () => {
    const center: GeoPosition = [48.8566, 2.3522];

    expect(getNearbyPosition(center, "mission-123", 1)).toEqual(getNearbyPosition(center, "mission-123", 1));
  });

  it("ne retourne pas exactement le centre", () => {
    const center: GeoPosition = [48.8566, 2.3522];

    expect(getNearbyPosition(center, "mission-123", 1)).not.toEqual(center);
  });

  it("retourne des positions différentes pour des indexes différents", () => {
    const center: GeoPosition = [48.8566, 2.3522];

    expect(getNearbyPosition(center, "mission-123", 1)).not.toEqual(getNearbyPosition(center, "mission-123", 2));
  });
});
