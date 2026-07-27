import { describe, expect, it } from "vitest";

import { GATE_TAXONOMIES } from "@engagement/taxonomy";

import { defineMatchingEngineVersion, MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";

describe("matching engine config", () => {
  it("inclut toujours les gates et n'expose que des poids numériques", () => {
    for (const config of Object.values(MATCHING_ENGINE_VERSIONS)) {
      for (const gate of GATE_TAXONOMIES) {
        expect(config.taxonomyKeys).toContain(gate);
      }
      expect(Object.keys(config.taxonomyWeights).sort()).toEqual([...config.taxonomyKeys].sort());
      expect(Object.values(config.taxonomyWeights).every((weight) => typeof weight === "number")).toBe(true);
    }
  });

  it("injecte les gates avec un poids par défaut sans les déclarer", () => {
    const config = defineMatchingEngineVersion({
      taxonomyWeights: { domaine: 0.5 },
      geoWeight: 0.3,
      remoteFullGeoScore: null,
      remoteLocalGeoScore: null,
    });

    const weights = config.taxonomyWeights as Record<string, number>;
    for (const gate of GATE_TAXONOMIES) {
      expect(weights[gate]).toBe(1);
    }
  });

  it("conserve les poids explicitement configurés, y compris pour une gate", () => {
    const config = defineMatchingEngineVersion({
      taxonomyWeights: { domaine: 0.5, tranche_age: 0.2 },
      geoWeight: 0.3,
      remoteFullGeoScore: null,
      remoteLocalGeoScore: null,
    });

    expect(config.taxonomyWeights.domaine).toBe(0.5);
    expect(config.taxonomyWeights.tranche_age).toBe(0.2);
  });
});
