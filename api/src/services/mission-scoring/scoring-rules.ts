import type { MissionType } from "@/db/core";
import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { parseTaxonomyValueKey } from "@engagement/taxonomy";

import { PUBLISHER_IDS } from "@/config";

type MissionScoringRuleMission = {
  publisherId: string | null;
  type: MissionType | null;
  openToMinors: boolean | null;
};

type MissionScoringRuleField = keyof MissionScoringRuleMission;

type MissionScoringRules = {
  // La clé est la forme stringifiée de la valeur (cf. `String(value)` dans
  // getMissionScoringRuleKeys) : `boolean` devient "true" | "false", ce qui permet
  // des champs booléens comme `openToMinors` tout en gardant un index valide.
  [Field in MissionScoringRuleField]?: Partial<Record<`${NonNullable<MissionScoringRuleMission[Field]>}`, TaxonomyValueKey[]>>;
};

/**
 * Taxonomy value keys injected directly into mission_scoring for specific mission fields.
 * These values bypass LLM enrichment and are set deterministically from mission data.
 * Score is always 1.0 and missionEnrichmentValueId is null.
 */
export const SCORING_RULES = {
  publisherId: {
    [PUBLISHER_IDS.SERVICE_CIVIQUE]: ["tranche_age.moins_18_ans", "tranche_age.entre_18_25_ans", "tranche_age.moins_31_ans_handicap"],
    [PUBLISHER_IDS.ROC]: [
      "tranche_age.entre_16_17_ans",
      "tranche_age.entre_18_25_ans",
      "tranche_age.entre_25_30_ans",
      "tranche_age.entre_30_45_ans",
      "tranche_age.entre_46_67_ans",
      "tranche_age.entre_68_72_ans",
    ],
  },
  type: {
    volontariat_sapeurs_pompiers: [
      "tranche_age.entre_16_17_ans",
      "tranche_age.entre_18_25_ans",
      "tranche_age.entre_25_30_ans",
      "tranche_age.entre_30_45_ans",
      "tranche_age.entre_46_66_ans",
    ],
  },
  // Mission fermée aux mineurs : seules les tranches d'âge adultes sont autorisées.
  // Combinée par intersection avec les autres règles (cf. getMissionScoringRuleKeys),
  // cette contrainte exclut du matching tout utilisateur de moins de 18 ans.
  openToMinors: {
    false: [
      "tranche_age.entre_18_25_ans",
      "tranche_age.entre_25_30_ans",
      "tranche_age.entre_30_45_ans",
      "tranche_age.entre_46_67_ans",
      "tranche_age.entre_46_66_ans",
      "tranche_age.entre_68_72_ans",
      "tranche_age.plus_72_ans",
    ],
  },
} satisfies MissionScoringRules;

/**
 * Intersection d'une liste d'ensembles. Fonction **totale** : retourne un ensemble vide pour
 * une liste vide, là où `reduce` sans valeur initiale lèverait. Exportée pour être testée
 * directement (le cas « intersection vide » n'est pas atteignable via les règles réelles).
 */
export const intersect = (sets: Set<TaxonomyValueKey>[]): Set<TaxonomyValueKey> => {
  const [first, ...rest] = sets;
  if (!first) {
    return new Set<TaxonomyValueKey>();
  }
  return rest.reduce((acc, set) => new Set([...acc].filter((key) => set.has(key))), new Set(first));
};

/**
 * Résout les clés de taxonomie injectées déterministiquement pour une mission.
 *
 * Chaque règle applicable exprime une contrainte d'allowlist par taxonomie. Quand plusieurs
 * règles contraignent la même taxonomie, on prend l'**intersection** des ensembles (la
 * contrainte la moins permissive gagne). Exemple : une mission Service Civique
 * `openToMinors=false` ne conserve sur `tranche_age` que l'intersection des tranches SC et
 * des tranches adultes, ce qui exclut les mineurs sans réouvrir la mission aux autres âges.
 */
export const getMissionScoringRuleKeys = (mission: MissionScoringRuleMission): TaxonomyValueKey[] => {
  // taxonomie -> liste des ensembles autorisés (un par règle applicable)
  const constraintsByTaxonomy = new Map<string, Set<TaxonomyValueKey>[]>();

  for (const [field, rulesByValue] of Object.entries(SCORING_RULES) as [MissionScoringRuleField, Partial<Record<string, TaxonomyValueKey[]>>][]) {
    const value = mission[field];
    if (value == null) {
      continue;
    }

    const ruleKeys = rulesByValue[String(value)];
    if (!ruleKeys) {
      continue;
    }

    // Regroupe les clés de CETTE règle par taxonomie avant de les agréger.
    const ruleSetsByTaxonomy = new Map<string, Set<TaxonomyValueKey>>();
    for (const key of ruleKeys) {
      const parsed = parseTaxonomyValueKey(key);
      if (!parsed) {
        continue;
      }

      const set = ruleSetsByTaxonomy.get(parsed.taxonomyKey) ?? new Set<TaxonomyValueKey>();
      set.add(key);
      ruleSetsByTaxonomy.set(parsed.taxonomyKey, set);
    }

    for (const [taxonomyKey, set] of ruleSetsByTaxonomy) {
      const list = constraintsByTaxonomy.get(taxonomyKey) ?? [];
      list.push(set);
      constraintsByTaxonomy.set(taxonomyKey, list);
    }
  }

  const keys: TaxonomyValueKey[] = [];
  for (const [taxonomyKey, sets] of constraintsByTaxonomy) {
    const intersection = intersect(sets);
    if (intersection.size === 0) {
      // Garde-fou de SÛRETÉ : une intersection vide n'injecterait aucune valeur, ce que le
      // matching interprète comme « aucune contrainte » (gate inactif, mission ouverte à tous)
      // plutôt que « personne ne passe ». Pour un gate de sûreté comme `tranche_age` (exclusion
      // des mineurs), ce fail-open est dangereux. Le mécanisme d'allowlist ne permet pas de
      // « bloquer tout le monde » proprement, donc on conserve le fail-open mais on le rend
      // bruyant : c'est une anomalie de configuration. L'invariant « aucune règle tranche_age
      // n'est un sous-ensemble de mineurs » (cf. test) garantit que ce cas est inatteignable.
      console.error(`[mission-scoring] ANOMALIE config: intersection vide pour la taxonomie '${taxonomyKey}' — gate NON appliqué (fail-open). Vérifier SCORING_RULES.`);
      continue;
    }

    keys.push(...intersection);
  }

  return keys;
};
