import { describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { getMissionScoringRuleKeys, intersect, SCORING_RULES } from "@/services/mission-scoring/scoring-rules";
import type { TaxonomyValueKey } from "@engagement/taxonomy";

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

// Note : la co-occurrence de DEUX règles sur la même taxonomie `tranche_age` est exercée par
// le cas réel « Service Civique + openToMinors=false » du bloc ci-dessus (deux ensembles
// tranche_age → intersection → {entre_18_25_ans}). Aucun couple de règles `publisherId`/`type`
// ne peut co-occurrer en pratique (un publisher ROC n'émet pas de mission de type pompier),
// donc on ne fabrique pas de scénario artificiel ; la mécanique d'intersection pure est
// validée de façon isolée par le bloc `intersect` ci-dessous.

describe("intersect", () => {
  const set = (...keys: string[]): Set<TaxonomyValueKey> => new Set(keys as TaxonomyValueKey[]);

  it("retourne un ensemble vide pour une liste vide (totale, ne lève pas)", () => {
    expect([...intersect([])]).toEqual([]);
  });

  it("retourne l'ensemble lui-même pour un seul ensemble", () => {
    expect(sorted([...intersect([set("tranche_age.entre_18_25_ans", "tranche_age.entre_25_30_ans")])])).toEqual(
      sorted(["tranche_age.entre_18_25_ans", "tranche_age.entre_25_30_ans"])
    );
  });

  it("retourne l'intersection de plusieurs ensembles", () => {
    const result = intersect([
      set("tranche_age.entre_18_25_ans", "tranche_age.entre_25_30_ans", "tranche_age.entre_30_45_ans"),
      set("tranche_age.entre_25_30_ans", "tranche_age.entre_30_45_ans", "tranche_age.entre_46_67_ans"),
      set("tranche_age.entre_30_45_ans"),
    ]);

    expect([...result]).toEqual(["tranche_age.entre_30_45_ans"]);
  });

  it("retourne un ensemble vide pour des ensembles disjoints", () => {
    expect([...intersect([set("tranche_age.entre_18_25_ans"), set("tranche_age.moins_18_ans")])]).toEqual([]);
  });
});

describe("SCORING_RULES — invariant de sûreté (fail-open inatteignable)", () => {
  // L'allowlist adulte (openToMinors=false) est la source de vérité.
  const adultTrancheAge: string[] = SCORING_RULES.openToMinors.false;

  // Toute règle qui injecte `tranche_age` doit, intersectée avec l'allowlist adulte, rester
  // non vide. Sinon une mission openToMinors=false portant cette règle produirait une
  // intersection vide → gate désactivé (fail-open) → des mineurs pourraient matcher.
  const trancheAgeRules: { label: string; keys: string[] }[] = [];
  for (const [field, rulesByValue] of Object.entries(SCORING_RULES)) {
    if (field === "openToMinors") {
      continue;
    }
    for (const [value, keys] of Object.entries(rulesByValue as Record<string, string[]>)) {
      const trancheKeys = keys.filter((key) => key.startsWith("tranche_age."));
      if (trancheKeys.length > 0) {
        trancheAgeRules.push({ label: `${field}.${value}`, keys: trancheKeys });
      }
    }
  }

  it("au moins une règle tranche_age existe (garantit que le test est pertinent)", () => {
    expect(trancheAgeRules.length).toBeGreaterThan(0);
  });

  it.each(trancheAgeRules)("la règle $label conserve au moins une tranche adulte sous openToMinors=false", ({ keys }) => {
    const overlap = keys.filter((key) => adultTrancheAge.includes(key));
    expect(overlap.length).toBeGreaterThan(0);
  });
});
