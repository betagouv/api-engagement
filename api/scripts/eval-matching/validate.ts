import { z } from "zod";

import { TAXONOMY } from "@engagement/taxonomy";
import type { Parcours, UserScoringAnswer } from "./types";

const answerSchema = z.union([
  z.object({ taxonomy: z.string(), value: z.string(), params: z.never().optional() }),
  z.object({ taxonomy: z.string(), params: z.record(z.string(), z.unknown()), value: z.never().optional() }),
]);

const parcoursSchema = z.object({
  id: z.string().min(1),
  segment: z.enum(["lyceen", "etudiant", "demandeur_emploi", "actif", "autre"]),
  label: z.string().min(1),
  locationLabel: z.string().min(1),
  age: z.number().int().min(16).max(99),
  handicap: z.enum(["oui", "non", "ne_se_prononce_pas"]).optional(),
  answers: z.array(answerSchema).min(1),
  notes: z.array(z.string()).optional(),
});

const configSchema = z.array(parcoursSchema).length(15);

const precisionByMotivation: Record<string, string[]> = {
  me_sentir_utile: ["engagement_intent"],
  reprendre_confiance: ["engagement_intent"],
  booster_parcoursup: ["parcoursup_formation", "domaine"],
  decouvrir_domaine: ["domaine"],
  ne_sais_pas: ["domaine"],
  tester_orientation: ["formation_onisep"],
  experience_terrain: ["formation_onisep"],
  preparer_reconversion: ["formation_onisep"],
  booster_cv: ["competence_rome"],
  enrichir_cv: ["competence_rome"],
  competences_interet_general: ["competence_rome"],
  reprendre_activite: ["secteur_activite"],
  servir_le_pays: ["servir_pays"],
};

const taxonomyKeys = new Set(Object.keys(TAXONOMY));

const valuesFor = (taxonomy: string): Set<string> | null => {
  const entry = TAXONOMY[taxonomy as keyof typeof TAXONOMY];
  if (!entry || !("values" in entry)) return null;
  return new Set(Object.keys(entry.values));
};

const isValueAnswer = (answer: UserScoringAnswer): answer is Extract<UserScoringAnswer, { value: string }> => "value" in answer && typeof answer.value === "string";
const isParamsAnswer = (answer: UserScoringAnswer): answer is Extract<UserScoringAnswer, { params: Record<string, unknown> }> => "params" in answer && typeof answer.params === "object";

const getValues = (answers: UserScoringAnswer[], taxonomy: string): string[] => {
  const values: string[] = [];
  for (const answer of answers) {
    if (answer.taxonomy === taxonomy && isValueAnswer(answer)) {
      values.push(answer.value);
    }
  }
  return values;
};

const hasParams = (answers: UserScoringAnswer[], taxonomy: string): boolean => answers.some((answer) => answer.taxonomy === taxonomy && isParamsAnswer(answer));

export const validateParcoursConfig = (input: unknown): Parcours[] => {
  const parcours = configSchema.parse(input) as Parcours[];
  const ids = new Set<string>();

  for (const item of parcours) {
    if (ids.has(item.id)) {
      throw new Error(`Parcours duplique: ${item.id}`);
    }
    ids.add(item.id);

    for (const answer of item.answers) {
      if (!taxonomyKeys.has(answer.taxonomy)) {
        throw new Error(`${item.id}: taxonomie inconnue '${answer.taxonomy}'`);
      }
      if (isValueAnswer(answer)) {
        const allowedValues = valuesFor(answer.taxonomy);
        if (!allowedValues?.has(answer.value)) {
          throw new Error(`${item.id}: valeur inconnue '${answer.taxonomy}.${answer.value}'`);
        }
      }
    }

    const locationAnswers = item.answers.filter((answer) => answer.taxonomy === "location");
    if (locationAnswers.length !== 1 || !hasParams(item.answers, "location")) {
      throw new Error(`${item.id}: exactement une answer location params est requise`);
    }

    const trancheAge = item.answers.find((answer) => answer.taxonomy === "tranche_age" && isParamsAnswer(answer));
    if (!trancheAge || !isParamsAnswer(trancheAge) || trancheAge.params.age !== item.age) {
      throw new Error(`${item.id}: tranche_age.params.age doit correspondre a age`);
    }

    const expectsHandicap = item.age >= 26 && item.age <= 30;
    const handicapValues = getValues(item.answers, "handicap");
    if (expectsHandicap && handicapValues.length !== 1) {
      throw new Error(`${item.id}: answer handicap requise pour les ages 26-30`);
    }
    if (!expectsHandicap && handicapValues.length > 0) {
      throw new Error(`${item.id}: answer handicap interdite hors ages 26-30`);
    }
    if (expectsHandicap && item.handicap !== handicapValues[0]) {
      throw new Error(`${item.id}: champ handicap incoherent avec answer handicap`);
    }
    const expectedHandicapBoolean = item.handicap === "oui";
    if (trancheAge.params.handicap !== expectedHandicapBoolean) {
      throw new Error(`${item.id}: tranche_age.params.handicap incoherent avec la reponse handicap`);
    }

    const motivations = getValues(item.answers, "motivation");
    if (motivations.length !== 1) {
      throw new Error(`${item.id}: exactement une motivation est requise`);
    }
    for (const expectedTaxonomy of precisionByMotivation[motivations[0]] ?? []) {
      if (!getValues(item.answers, expectedTaxonomy).length) {
        throw new Error(`${item.id}: precision '${expectedTaxonomy}' attendue pour motivation '${motivations[0]}'`);
      }
    }
  }

  return parcours;
};

export const getAnswerValues = getValues;
