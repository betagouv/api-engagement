import type { MissionRemote, MissionType } from "@/db/core";
import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { parseTaxonomyValueKey } from "@engagement/taxonomy";

import { PUBLISHER_IDS } from "@/config";

type MissionScoringRuleMission = {
  publisherId: string | null;
  type: MissionType | null;
  remote: MissionRemote | null;
  openToMinors: boolean | null;
  compensationAmount: number | null;
};

type MissionScoringRuleOutput = {
  mode: "replace" | "add";
  values: TaxonomyValueKey[];
};

type MissionScoringEqualsRule = {
  [Field in keyof MissionScoringRuleMission]: {
    field: Field;
    condition: { operator: "equals"; value: NonNullable<MissionScoringRuleMission[Field]> };
  } & MissionScoringRuleOutput;
}[keyof MissionScoringRuleMission];

type MissionScoringPresentRule = {
  field: keyof MissionScoringRuleMission;
  condition: { operator: "present" };
} & MissionScoringRuleOutput;

type MissionScoringRule = MissionScoringEqualsRule | MissionScoringPresentRule;

const ALL_TRANCHE_AGE_KEYS = [
  "tranche_age.moins_18_ans",
  "tranche_age.entre_18_25_ans",
  "tranche_age.entre_25_30_ans",
  "tranche_age.entre_30_45_ans",
  "tranche_age.entre_46_67_ans",
  "tranche_age.entre_68_72_ans",
  "tranche_age.plus_72_ans",
  "tranche_age.entre_46_66_ans",
  "tranche_age.moins_31_ans_handicap",
] satisfies TaxonomyValueKey[];

const ADULT_TRANCHE_AGE_KEYS = [
  "tranche_age.entre_18_25_ans",
  "tranche_age.entre_25_30_ans",
  "tranche_age.entre_30_45_ans",
  "tranche_age.entre_46_67_ans",
  "tranche_age.entre_46_66_ans",
  "tranche_age.entre_68_72_ans",
  "tranche_age.plus_72_ans",
] satisfies TaxonomyValueKey[];

/**
 * Règles déterministes injectées directement dans mission_scoring.
 *
 * - `equals` compare la valeur du champ à une valeur précise ;
 * - `present` vérifie uniquement que le champ n'est ni null ni undefined ;
 * - `replace` remplace les valeurs enrichies de la taxonomie et intersecte les
 *   allowlists lorsque plusieurs règles la contraignent ;
 * - `add` complète les valeurs enrichies sans les remplacer.
 *
 * Les valeurs produites ont toujours un score de 1 et aucun missionEnrichmentValueId.
 */
export const SCORING_RULES = [
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.SERVICE_CIVIQUE },
    mode: "replace",
    values: ["tranche_age.moins_18_ans", "tranche_age.entre_18_25_ans", "tranche_age.moins_31_ans_handicap", "type_mission.temps_plein", "dispositif.service_civique"],
  },
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.ROC },
    mode: "replace",
    values: [
      "tranche_age.moins_18_ans",
      "tranche_age.entre_18_25_ans",
      "tranche_age.entre_25_30_ans",
      "tranche_age.entre_30_45_ans",
      "tranche_age.entre_46_67_ans",
      "tranche_age.entre_68_72_ans",
    ],
  },
  {
    field: "type",
    condition: { operator: "equals", value: "benevolat" },
    mode: "replace",
    values: ["dispositif.benevolat"],
  },
  {
    field: "type",
    condition: { operator: "equals", value: "volontariat_sapeurs_pompiers" },
    mode: "replace",
    values: [
      "dispositif.sapeurs_pompiers",
      "tranche_age.moins_18_ans",
      "tranche_age.entre_18_25_ans",
      "tranche_age.entre_25_30_ans",
      "tranche_age.entre_30_45_ans",
      "tranche_age.entre_46_66_ans",
    ],
  },
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.GENDARMERIE },
    mode: "replace",
    values: ["dispositif.reserve_gendarmerie"],
  },
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.POLICE },
    mode: "replace",
    values: ["dispositif.reserve_police_nationale"],
  },

  // Élargissement thématique des dispositifs de sécurité (référencement manuel, hors enrichissement).
  //
  // Toutes les règles ci-dessous sont en mode `add` : elles complètent les domaines/activités/
  // motivations produits par l'enrichissement (« Sécurité et secours » / « Secourir et protéger »)
  // au lieu de les remplacer, pour ouvrir ces missions à de nouvelles portes d'entrée du quiz.

  // Sapeurs-pompiers volontaires : le secours à personne est l'essentiel de l'activité, on
  // référence donc aussi Santé et bien-être, Solidarité et l'activité « Aider et accompagner ».
  // On leur rattache également « Je veux découvrir un métier » (mission de découverte métier).
  {
    field: "type",
    condition: { operator: "equals", value: "volontariat_sapeurs_pompiers" },
    mode: "add",
    values: ["domaine_engagement.sante_bien_etre", "domaine_engagement.solidarite_inclusion", "activite.aider_accompagner", "motivation_recherche.decouverte_metier"],
  },
  // Réserves opérationnelles (police, gendarmerie, et armées à venir) : missions de découverte
  // d'un métier. Ciblé sur le type pour couvrir toutes les réserves, y compris sans publisher dédié.
  {
    field: "type",
    condition: { operator: "equals", value: "volontariat_reserve_operationnelle" },
    mode: "add",
    values: ["motivation_recherche.decouverte_metier"],
  },
  // Réserve gendarmerie / police : on ajoute Citoyenneté aux missions de réserve. Ciblé sur le
  // publisher (et non le type) pour n'inclure que ces deux réserves, à l'exclusion des armées.
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.GENDARMERIE },
    mode: "add",
    values: ["domaine_engagement.citoyennete"],
  },
  {
    field: "publisherId",
    condition: { operator: "equals", value: PUBLISHER_IDS.POLICE },
    mode: "add",
    values: ["domaine_engagement.citoyennete"],
  },

  // Mission fermée aux mineurs : seules les tranches d'âge adultes sont autorisées.
  // Combinée par intersection avec les autres règles (cf. getMissionScoringRuleKeys),
  // cette contrainte exclut du matching tout utilisateur de moins de 18 ans.
  {
    field: "openToMinors",
    condition: { operator: "equals", value: false },
    mode: "replace",
    values: ADULT_TRANCHE_AGE_KEYS,
  },
  // Les filtres Typesense sont explicites : une taxonomie absente est indexée comme
  // un tableau vide, pas comme une absence de contrainte. Les gates ne contribuent
  // pas au score pondéré du matching engine et peuvent donc être matérialisées ici.
  {
    field: "openToMinors",
    condition: { operator: "equals", value: true },
    mode: "replace",
    values: ALL_TRANCHE_AGE_KEYS,
  },
  {
    field: "compensationAmount",
    condition: { operator: "present" },
    mode: "add",
    values: ["motivation_recherche.indemnisation"],
  },
  {
    field: "remote",
    condition: { operator: "equals", value: "full" },
    mode: "add",
    values: ["motivation_recherche.remote"],
  },
] satisfies MissionScoringRule[];

export type ResolvedMissionScoringRules = {
  keys: TaxonomyValueKey[];
  replacedTaxonomyKeys: Set<string>;
};

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
export const resolveMissionScoringRules = (mission: MissionScoringRuleMission): ResolvedMissionScoringRules => {
  // Taxonomie -> ensembles de remplacement à intersecter + valeurs additives à réunir.
  const rulesByTaxonomy = new Map<string, { replaceSets: Set<TaxonomyValueKey>[]; additiveKeys: Set<TaxonomyValueKey> }>();

  const addRuleKeys = (rule: MissionScoringRule): void => {
    // Regroupe les clés de CETTE règle par taxonomie avant de les agréger.
    const ruleSetsByTaxonomy = new Map<string, Set<TaxonomyValueKey>>();
    for (const key of rule.values) {
      const parsed = parseTaxonomyValueKey(key);
      if (!parsed) {
        continue;
      }

      const set = ruleSetsByTaxonomy.get(parsed.taxonomyKey) ?? new Set<TaxonomyValueKey>();
      set.add(key);
      ruleSetsByTaxonomy.set(parsed.taxonomyKey, set);
    }

    for (const [taxonomyKey, set] of ruleSetsByTaxonomy) {
      const taxonomyRules = rulesByTaxonomy.get(taxonomyKey) ?? {
        replaceSets: [],
        additiveKeys: new Set<TaxonomyValueKey>(),
      };
      if (rule.mode === "replace") {
        taxonomyRules.replaceSets.push(set);
      } else {
        for (const key of set) {
          taxonomyRules.additiveKeys.add(key);
        }
      }
      rulesByTaxonomy.set(taxonomyKey, taxonomyRules);
    }
  };

  for (const rule of SCORING_RULES) {
    const fieldValue = mission[rule.field];
    const matches = rule.condition.operator === "present" ? fieldValue != null : fieldValue === rule.condition.value;
    if (matches) {
      addRuleKeys(rule);
    }
  }

  const keys: TaxonomyValueKey[] = [];
  const replacedTaxonomyKeys = new Set<string>();
  for (const [taxonomyKey, taxonomyRules] of rulesByTaxonomy) {
    const intersection = intersect(taxonomyRules.replaceSets);
    if (taxonomyRules.replaceSets.length > 0 && intersection.size === 0) {
      // Garde-fou de SÛRETÉ : une intersection vide n'injecterait aucune valeur, ce que le
      // matching interprète comme « aucune contrainte » (gate inactif, mission ouverte à tous)
      // plutôt que « personne ne passe ». Pour un gate de sûreté comme `tranche_age` (exclusion
      // des mineurs), ce fail-open est dangereux. Le mécanisme d'allowlist ne permet pas de
      // « bloquer tout le monde » proprement, donc on conserve le fail-open mais on le rend
      // bruyant : c'est une anomalie de configuration. L'invariant « aucune règle tranche_age
      // n'est un sous-ensemble de mineurs » (cf. test) garantit que ce cas est inatteignable.
      console.error(`[mission-scoring] ANOMALIE config: intersection vide pour la taxonomie '${taxonomyKey}' — gate NON appliqué (fail-open). Vérifier SCORING_RULES.`);
    } else if (taxonomyRules.replaceSets.length > 0) {
      replacedTaxonomyKeys.add(taxonomyKey);
      keys.push(...intersection);
    }

    keys.push(...taxonomyRules.additiveKeys);
  }

  return { keys, replacedTaxonomyKeys };
};

export const getMissionScoringRuleKeys = (mission: MissionScoringRuleMission): TaxonomyValueKey[] => resolveMissionScoringRules(mission).keys;
