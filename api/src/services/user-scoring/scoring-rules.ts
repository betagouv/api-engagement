import type { TaxonomyKey, TaxonomyValueKey } from "@engagement/taxonomy";

type UserScoringValue = {
  taxonomyKey: string;
  valueKey: string;
};

type UserScoringRule = {
  taxonomy: TaxonomyKey;
  condition: { operator: "equals"; value: string };
  values: readonly TaxonomyValueKey[];
};

export type UserScoringRuleValue = {
  key: TaxonomyValueKey;
  score: number;
};

/** Affinités déduites des réponses. */
export const SCORING_RULES = [
  {
    taxonomy: "tranche_age",
    condition: { operator: "equals", value: "moins_18_ans" },
    values: ["dispositif.service_civique"],
  },
  {
    taxonomy: "tranche_age",
    condition: { operator: "equals", value: "entre_18_25_ans" },
    values: ["dispositif.service_civique"],
  },
  {
    taxonomy: "tranche_age",
    condition: { operator: "equals", value: "moins_31_ans_handicap" },
    values: ["dispositif.service_civique"],
  },
  {
    taxonomy: "motivation_recherche",
    condition: { operator: "equals", value: "indemnisation" },
    values: ["dispositif.service_civique", "dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "motivation_recherche",
    condition: { operator: "equals", value: "premiere_experience" },
    values: ["dispositif.service_civique", "dispositif.benevolat"],
  },
  {
    taxonomy: "motivation_recherche",
    condition: { operator: "equals", value: "decouverte_metier" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "motivation_recherche",
    condition: { operator: "equals", value: "securite_pays" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "motivation",
    condition: { operator: "equals", value: "booster_parcoursup" },
    values: ["dispositif.benevolat", "dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "rythme",
    condition: { operator: "equals", value: "ponctuelle_journee" },
    values: ["dispositif.benevolat", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale"],
  },
  {
    taxonomy: "rythme",
    condition: { operator: "equals", value: "quelques_heures_semaine" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "rythme",
    condition: { operator: "equals", value: "plusieurs_jours_semaine" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "rythme",
    condition: { operator: "equals", value: "quelques_jours_annee" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "rythme",
    condition: { operator: "equals", value: "temps_plein_plusieurs_mois" },
    values: ["dispositif.service_civique"],
  },
  {
    taxonomy: "domaine_engagement",
    condition: { operator: "equals", value: "solidarite_inclusion" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "domaine_engagement",
    condition: { operator: "equals", value: "sante_bien_etre" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "domaine_engagement",
    condition: { operator: "equals", value: "securite_secours" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "domaine_engagement",
    condition: { operator: "equals", value: "sport" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "domaine_engagement",
    condition: { operator: "equals", value: "citoyennete" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "equipe",
    condition: { operator: "equals", value: "grand_collectif" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "autonomie",
    condition: { operator: "equals", value: "accompagnement_initial" },
    values: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
  },
  {
    taxonomy: "activite",
    condition: { operator: "equals", value: "aider_accompagner" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "activite",
    condition: { operator: "equals", value: "fabriquer_reparer_terrain" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  {
    taxonomy: "activite",
    condition: { operator: "equals", value: "organiser_coordonner" },
    values: ["dispositif.sapeurs_pompiers"],
  },
  // Les réponses ci-dessus restent aussi des signaux thématiques directs ; seules les affinités
  // de dispositif explicitement listées sont déduites en complément.
] as const satisfies readonly UserScoringRule[];

export const getUserScoringRuleValues = (values: UserScoringValue[]): UserScoringRuleValue[] => {
  const scores = new Map<TaxonomyValueKey, number>();
  for (const rule of SCORING_RULES) {
    if (!values.some((value) => value.taxonomyKey === rule.taxonomy && value.valueKey === rule.condition.value)) {
      continue;
    }
    for (const key of rule.values) {
      scores.set(key, (scores.get(key) ?? 0) + 1);
    }
  }
  return [...scores].map(([key, score]) => ({ key, score }));
};

export const getUserScoringRuleKeys = (values: UserScoringValue[]): TaxonomyValueKey[] => getUserScoringRuleValues(values).map(({ key }) => key);
