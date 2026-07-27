import { describe, expect, it } from "vitest";

import { GATE_TAXONOMIES } from "@engagement/taxonomy";

import { defineMatchingEngineVersion, MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";
import { PROMPT_REGISTRY } from "@/services/mission-enrichment/prompts";

describe("matching engine config", () => {
  it("dérive toutes les taxonomies du prompt ciblé et les gates", () => {
    for (const config of Object.values(MATCHING_ENGINE_VERSIONS)) {
      const expectedKeys = [...new Set([...PROMPT_REGISTRY[config.promptVersion].TAXONOMY_KEYS, ...GATE_TAXONOMIES])];

      expect([...config.taxonomyKeys].sort()).toEqual([...expectedKeys].sort());
      expect(Object.keys(config.taxonomyWeights).sort()).toEqual([...expectedKeys].sort());
      expect(Object.values(config.taxonomyWeights).every((weight) => weight === 1)).toBe(true);
    }
  });

  it("conserve les poids explicitement configurés", () => {
    const config = defineMatchingEngineVersion({
      promptVersion: "v4",
      taxonomyWeights: {
        domaine: 0.5,
        secteur_activite: 1,
        type_mission: 1,
        competence_rome: 1,
        region_internationale: 1,
        engagement_intent: 1,
        formation_onisep: 1,
        tranche_age: 1,
      },
      geoWeight: 0.3,
      remoteFullGeoScore: null,
      remoteLocalGeoScore: null,
    });

    expect(config.taxonomyWeights.domaine).toBe(0.5);
  });

  it("refuse au runtime une taxonomie manquante", () => {
    expect(() =>
      defineMatchingEngineVersion({
        promptVersion: "v4",
        taxonomyWeights: {
          domaine: 1,
        },
        geoWeight: 0.3,
        remoteFullGeoScore: null,
        remoteLocalGeoScore: null,
      } as never)
    ).toThrow("taxonomies manquantes");
  });

  it("refuse au runtime une taxonomie absente du prompt ciblé", () => {
    expect(() =>
      defineMatchingEngineVersion({
        promptVersion: "v4",
        taxonomyWeights: {
          domaine: 1,
          secteur_activite: 1,
          type_mission: 1,
          competence_rome: 1,
          region_internationale: 1,
          engagement_intent: 1,
          formation_onisep: 1,
          tranche_age: 1,
          rythme: 1,
        },
        geoWeight: 0.3,
        remoteFullGeoScore: null,
        remoteLocalGeoScore: null,
      } as never)
    ).toThrow("taxonomies absentes du prompt : rythme");
  });
});
