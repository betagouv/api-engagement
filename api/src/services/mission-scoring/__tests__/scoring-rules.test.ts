import { describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { getMissionScoringRuleKeys } from "@/services/mission-scoring/scoring-rules";

type RuleMission = Parameters<typeof getMissionScoringRuleKeys>[0];

const buildMission = (overrides: Partial<RuleMission> = {}): RuleMission => ({
  publisherId: null,
  type: null,
  openToMinors: null,
  ...overrides,
});

const ADULT_TRANCHE_AGE_KEYS = [
  "tranche_age.entre_18_25_ans",
  "tranche_age.entre_25_30_ans",
  "tranche_age.entre_30_45_ans",
  "tranche_age.entre_46_67_ans",
  "tranche_age.entre_46_66_ans",
  "tranche_age.entre_68_72_ans",
  "tranche_age.plus_72_ans",
];

const sorted = (keys: string[]): string[] => [...keys].sort();

describe("getMissionScoringRuleKeys — openToMinors", () => {
  it("injecte uniquement les tranches d'âge adultes quand openToMinors=false (mission sans autre règle)", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ openToMinors: false }));

    expect(sorted(keys)).toEqual(sorted(ADULT_TRANCHE_AGE_KEYS));
  });

  it("n'ajoute aucune contrainte tranche_age quand openToMinors=true", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ openToMinors: true }));

    expect(keys).toEqual([]);
  });

  it("n'ajoute aucune contrainte tranche_age quand openToMinors=null", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ openToMinors: null }));

    expect(keys).toEqual([]);
  });

  it("intersecte la règle Service Civique avec openToMinors=false (les mineurs sont exclus, la borne SC est respectée)", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE, openToMinors: false }));

    expect(keys).toEqual(["tranche_age.entre_18_25_ans"]);
    expect(keys).not.toContain("tranche_age.moins_18_ans");
    expect(keys).not.toContain("tranche_age.moins_31_ans_handicap");
  });

  it("conserve l'ensemble Service Civique complet quand openToMinors=true (non-régression)", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE, openToMinors: true }));

    expect(sorted(keys)).toEqual(sorted(["tranche_age.moins_18_ans", "tranche_age.entre_18_25_ans", "tranche_age.moins_31_ans_handicap"]));
  });

  it("conserve l'ensemble Service Civique complet quand openToMinors=null (non-régression)", () => {
    const keys = getMissionScoringRuleKeys(buildMission({ publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE, openToMinors: null }));

    expect(sorted(keys)).toEqual(sorted(["tranche_age.moins_18_ans", "tranche_age.entre_18_25_ans", "tranche_age.moins_31_ans_handicap"]));
  });
});
