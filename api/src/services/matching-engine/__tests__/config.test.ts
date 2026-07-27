import { describe, expect, it } from "vitest";

import { GATE_TAXONOMIES } from "@engagement/taxonomy";

import { defineMatchingEngineVersion, MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";

describe("matching engine config", () => {
  it("inclut toujours les gates sans leur attribuer de poids", () => {
    for (const config of Object.values(MATCHING_ENGINE_VERSIONS)) {
      for (const gate of GATE_TAXONOMIES) {
        expect(config.taxonomyKeys).toContain(gate);
        expect(config.taxonomyWeights[gate]).toBeUndefined();
      }
      expect(Object.values(config.taxonomyWeights).every((weight) => typeof weight === "number")).toBe(true);
    }
  });

  it("ajoute les gates aux clés actives sans les ajouter aux poids", () => {
    const config = defineMatchingEngineVersion({
      taxonomyWeights: { domaine: 0.5 },
      geoWeight: 0.3,
      remoteFullGeoScore: null,
      remoteLocalGeoScore: null,
    });

    for (const gate of GATE_TAXONOMIES) {
      expect(config.taxonomyKeys).toContain(gate);
      expect(config.taxonomyWeights[gate]).toBeUndefined();
    }
  });

  it("refuse d'attribuer un poids de ranking à une gate", () => {
    expect(() =>
      defineMatchingEngineVersion({
        taxonomyWeights: { domaine: 0.5, tranche_age: 0.2 },
        geoWeight: 0.3,
        remoteFullGeoScore: null,
        remoteLocalGeoScore: null,
      })
    ).toThrow("cannot have a ranking weight");
  });
});
