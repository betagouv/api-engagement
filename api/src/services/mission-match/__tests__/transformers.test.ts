import { describe, expect, it } from "vitest";

import type { MissionMatchValue } from "@engagement/dto";

import type { MatchMissionItem } from "@/services/matching-engine/types";
import { toMissionMatchItem } from "@/services/mission-match/transformers";

const missionEntry = (overrides: { city?: string | null } = {}) => ({
  title: "Mission",
  city: overrides.city ?? null,
  remote: null,
  schedule: null,
  domain: null,
  domainOriginal: null,
  domainLogo: null,
  publisherId: null,
  publisherName: null,
  publisherLogo: null,
  publisherDefaultMissionLogo: null,
  organizationName: null,
  organizationLogo: null,
  compensationAmount: null,
  compensationAmountMax: null,
  compensationUnit: null,
  compensationType: null,
});

const matchItem = (overrides: Partial<MatchMissionItem> = {}): MatchMissionItem => ({
  missionId: "mission",
  missionScoringId: "mission-scoring",
  missionAddressId: null,
  totalScore: 0.8,
  taxonomyScore: 0.9,
  geoScore: null,
  distanceKm: null,
  closestLat: null,
  closestLon: null,
  closestCity: null,
  closestAddress: null,
  taxonomyScores: {},
  ...overrides,
});

const matchValue = (taxonomyKey: string, valueKey: string): MissionMatchValue => ({
  taxonomyKey,
  taxonomyValueKey: valueKey,
  taxonomyValueLabel: valueKey,
  enrichmentConfidence: 1,
  scoringScore: 1,
  evidence: null,
});

const buildTagKeys = (item: MatchMissionItem, values: MissionMatchValue[], userValueKeys: string[], mission: { city?: string | null } = {}): string[] => {
  const result = toMissionMatchItem(item, { mission: missionEntry(mission) }, { "mission-scoring": values }, "publisher", new Set(userValueKeys));
  return result.match.missionCardTagKeys ?? [];
};

describe("toMissionMatchItem — missionCardTagKeys", () => {
  it("remonte la clé « à distance » via la taxonomie, sans cas particulier sur le champ remote", () => {
    const item = matchItem({ taxonomyScores: { motivation_recherche: 1 } });
    const values = [matchValue("motivation_recherche", "remote")];

    expect(buildTagKeys(item, values, ["motivation_recherche.remote"])).toEqual(["motivation_recherche.remote"]);
    expect(buildTagKeys(item, values, [])).toEqual([]);
  });

  it("retourne les valeurs demandées et portées par la mission, ordonnées par score décroissant", () => {
    const item = matchItem({ taxonomyScores: { imprevu: 0.5, equipe: 1 } });
    const values = [matchValue("imprevu", "adaptation_rapide"), matchValue("equipe", "petit_groupe")];

    expect(buildTagKeys(item, values, ["imprevu.adaptation_rapide", "equipe.petit_groupe"])).toEqual(["equipe.petit_groupe", "imprevu.adaptation_rapide"]);
  });

  it("ignore les valeurs non demandées par l'utilisateur et les taxonomies sans score", () => {
    const item = matchItem({ taxonomyScores: { equipe: 1, interaction: 0 } });
    const values = [matchValue("equipe", "grand_collectif"), matchValue("interaction", "interaction_collective")];

    expect(buildTagKeys(item, values, ["equipe.petit_groupe", "interaction.interaction_collective"])).toEqual([]);
  });

  it("ajoute la ville quand le score géo est haut, ordonnée par score", () => {
    const item = matchItem({ geoScore: 0.98, taxonomyScores: { imprevu: 0.5 } });
    const values = [matchValue("imprevu", "cadre_previsible")];

    expect(buildTagKeys(item, values, ["imprevu.cadre_previsible"], { city: "Grenoble" })).toEqual(["city", "imprevu.cadre_previsible"]);
  });

  it("n'ajoute pas la ville quand le score géo est bas ou que la mission n'en a pas", () => {
    expect(buildTagKeys(matchItem({ geoScore: 0.4 }), [], [], { city: "Grenoble" })).toEqual([]);
    expect(buildTagKeys(matchItem({ geoScore: 0.98 }), [], [])).toEqual([]);
  });
});
