import { describe, expect, it, vi } from "vitest";

import { GATE_TAXONOMIES } from "@engagement/taxonomy";

import {
  DEFAULT_MATCHING_ENGINE_VERSION,
  defineMatchingEngineVersion,
  inferMatchingEngineVersion,
  MATCHING_ENGINE_VERSIONS,
  resolveMatchingEngineVersion,
} from "@/services/matching-engine/config";

vi.mock("@/error", () => ({ captureMessage: vi.fn() }));

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
      taxonomyOrBaseScore: 0.8,
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
        taxonomyOrBaseScore: 0.8,
      })
    ).toThrow("cannot have a ranking weight");
  });

  it("abaisse le socle de base (taxonomyOrBaseScore) à 0.5 pour m4, 0.8 pour les versions précédentes", () => {
    expect(MATCHING_ENGINE_VERSIONS.m4.taxonomyOrBaseScore).toBe(0.5);
    for (const version of ["m1", "m2", "m3"] as const) {
      expect(MATCHING_ENGINE_VERSIONS[version].taxonomyOrBaseScore).toBe(0.8);
    }
  });

  it("ne conditionne le boost remote=full à l'intention que pour m5", () => {
    expect(MATCHING_ENGINE_VERSIONS.m5.gateRemoteFullGeoScoreOnIntent).toBe(true);
    for (const version of ["m1", "m2", "m3", "m4"] as const) {
      expect(MATCHING_ENGINE_VERSIONS[version].gateRemoteFullGeoScoreOnIntent).toBe(false);
    }
  });

  it("applique false par défaut au flag gateRemoteFullGeoScoreOnIntent", () => {
    const config = defineMatchingEngineVersion({
      taxonomyWeights: { domaine: 0.5 },
      geoWeight: 0.3,
      remoteFullGeoScore: 0.9,
      remoteLocalGeoScore: 0.95,
      taxonomyOrBaseScore: 0.8,
    });

    expect(config.gateRemoteFullGeoScoreOnIntent).toBe(false);
  });

  it.each(["constructor", "toString", "__proto__"])("rejette la propriété Object.prototype '%s' comme version", (version) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveMatchingEngineVersion(version)).toBe(DEFAULT_MATCHING_ENGINE_VERSION);

    warnSpy.mockRestore();
  });

  describe("inferMatchingEngineVersion", () => {
    it("fige un scoring identifiable q1 (taxonomie q1, aucune q2) sur m3, quelle que soit la version courante", () => {
      expect(inferMatchingEngineVersion(["domaine", "type_mission"], "m5")).toBe("m3");
      expect(inferMatchingEngineVersion(["formation_onisep"], "m5")).toBe("m3");
    });

    it("rattache un scoring q2 à la version courante", () => {
      expect(inferMatchingEngineVersion(["domaine_engagement", "rythme"], "m5")).toBe("m5");
    });

    it("rattache un parcours q2 partiel (taxonomies q1/gate uniquement) à la version courante", () => {
      // Un q2 commencé n'ayant encore que tranche_age (gate) ou une taxonomie q1 ne doit pas être classé q1.
      expect(inferMatchingEngineVersion(["tranche_age"], "m5")).toBe("m5");
      expect(inferMatchingEngineVersion(["domaine", "domaine_engagement"], "m5")).toBe("m5");
    });

    it("rattache un scoring sans taxonomie (géo-only, sans réponse) à la version courante", () => {
      expect(inferMatchingEngineVersion([], "m5")).toBe("m5");
      expect(inferMatchingEngineVersion([null, undefined], "m5")).toBe("m5");
    });
  });
});
