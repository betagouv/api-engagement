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

  it("reste à moins de 1,5 km du centre pour une page de résultats", () => {
    const center: GeoPosition = [43.2965, 5.3698];

    for (let index = 0; index < 20; index++) {
      const [lat, lon] = getNearbyPosition(center, `mission-${index}`, index);
      const km = Math.hypot((lat - center[0]) * 111, (lon - center[1]) * 111 * Math.cos((center[0] * Math.PI) / 180));
      expect(km).toBeLessThan(1.5);
    }
  });
});
