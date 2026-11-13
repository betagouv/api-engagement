import { describe, expect, it } from "vitest";

import { toMissionBrowse } from "@/services/mission-browse/transformers";
import type { MissionRecord } from "@/types/mission";

const NANTES = { lat: 47.2184, lon: -1.5536 };

const mission = {
  id: "mission-sdis-44",
  addresses: [
    { id: "bouguenais", city: "Bouguenais", country: "FR", location: { lat: 47.1777, lon: -1.6236 } },
    { id: "nantes-centre", city: "Nantes", country: "FR", location: { lat: 47.2173, lon: -1.5534 } },
    { id: "sans-coordonnees", city: "Saint-Nazaire", country: "FR", location: null },
  ],
  tags: [],
} as unknown as MissionRecord;

describe("toMissionBrowse", () => {
  it("retient la première adresse sans point de référence", () => {
    const result = toMissionBrowse(mission);

    expect(result.addressId).toBe("bouguenais");
    expect(result.city).toBe("Bouguenais");
  });

  it("retient l'adresse la plus proche du point de référence", () => {
    const result = toMissionBrowse(mission, NANTES);

    expect(result.addressId).toBe("nantes-centre");
    expect(result.city).toBe("Nantes");
  });
});
