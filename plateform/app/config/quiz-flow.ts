import { numericRange, or, screenAnswer, type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz.
// À étendre au fil des PR (precision_*, etc.).
export type StepId =
  | "age"
  | "handicap"
  | "statut"
  | "localisation"
  | "duree"
  | "motivation_lyceen"
  | "motivation_etudiant"
  | "motivation_demandeur_emploi"
  | "motivation_actif"
  | "motivation_autres";

export interface StepDef {
  id: StepId;
  route: string;
  condition?: Condition;
}

// Séquence et conditions de visibilité des steps.
// Le wording et les options de chaque step vivent dans le step component correspondant.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW: StepDef[] = [
  { id: "age", route: "/quiz/age" },
  // Handicap affiché uniquement si age ∈ [26, 30].
  { id: "handicap", route: "/quiz/handicap", condition: numericRange("age", 26, 30) },
  { id: "statut", route: "/quiz/statut" },
  { id: "localisation", route: "/quiz/localisation" },
  { id: "duree", route: "/quiz/duree" },

  // Étape 6 — embranchement motivation : un seul des 4 steps suivants est visible,
  // déterminé par la réponse à `statut`. Les options partagent volontairement les mêmes ids
  // (ex: me_sentir_utile, servir_le_pays) pour permettre des conditions cross-step via anyScreenHasAnswer.
  { id: "motivation_lyceen", route: "/quiz/motivation-lyceen", condition: screenAnswer("statut", "lyceen") },
  { id: "motivation_etudiant", route: "/quiz/motivation-etudiant", condition: screenAnswer("statut", "etudiant") },
  {
    id: "motivation_demandeur_emploi",
    route: "/quiz/motivation-demandeur-emploi",
    condition: screenAnswer("statut", "demandeur_emploi"),
  },
  { id: "motivation_actif", route: "/quiz/motivation-actif", condition: screenAnswer("statut", "actif") },
  { id: "motivation_autres", route: "/quiz/motivation-autres", condition: or(screenAnswer("statut", "autre"), screenAnswer("statut", "retraite")) },
];
