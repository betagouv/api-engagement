import { and, not, numericRange, or, screenAnswer, type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz.
// À étendre au fil des PR (autres precision_*, etc.).
export type StepId =
  | "age"
  | "handicap"
  | "statut"
  | "localisation"
  | "duree"
  | "motivation"
  | "precision_thematique"
  | "precision_parcoursup_formation"
  | "precision_parcoursup_formation_nom"
  | "precision_domaine"
  | "precision_formation_onisep"
  | "precision_competences"
  | "precision_reprendre_activite"
  | "precision_servir_pays"
  | "precision_international";

export interface StepDef {
  id: StepId;
  route: string;
  condition?: Condition;
}

// Séquence et conditions de visibilité des steps.
// Le wording et les options de chaque step vivent dans le step component correspondant.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW: StepDef[] = [
  // Étape 1 — age.
  { id: "age", route: "/quiz/age" },
  // Étape 2 — handicap.
  { id: "handicap", route: "/quiz/handicap", condition: numericRange("age", 26, 30) },
  // Étape 3 — statut.
  { id: "statut", route: "/quiz/statut" },
  // Étape 4 — localisation.
  { id: "localisation", route: "/quiz/localisation" },
  // Étape 5 — duree.
  { id: "duree", route: "/quiz/duree" },
  // Étape 6 — motivation. Les options sont filtrées dans le step via `hiddenIf` selon la réponse à `statut`.
  { id: "motivation", route: "/quiz/motivation" },

  // Étape 7 — précisions sur la motivation (embranchement).
  // → me_sentir_utile (toutes branches) : mapping référentiel `engagement_intent`.
  {
    id: "precision_thematique",
    route: "/quiz/precision-thematique",
    condition: or(screenAnswer("motivation", "motivation.me_sentir_utile"), screenAnswer("motivation", "motivation.reprendre_confiance")),
  },
  // → booster_parcoursup (lyceen) : 2 sous-steps avant le step domaine commun.
  {
    id: "precision_parcoursup_formation",
    route: "/quiz/precision-parcoursup-formation",
    condition: screenAnswer("motivation", "motivation.booster_parcoursup"),
  },
  {
    id: "precision_parcoursup_formation_nom",
    route: "/quiz/precision-parcoursup-formation-nom",
    condition: and(screenAnswer("motivation", "motivation.booster_parcoursup"), screenAnswer("precision_parcoursup_formation", "parcoursup_formation.oui")),
  },
  // → step `domaine` partagé : decouvrir_domaine, booster_parcoursup, ne_sais_pas. Titre adapté au contexte dans le step.
  {
    id: "precision_domaine",
    route: "/quiz/precision-domaine",
    condition: or(
      screenAnswer("motivation", "motivation.decouvrir_domaine"),
      screenAnswer("motivation", "motivation.booster_parcoursup"),
      screenAnswer("motivation", "motivation.ne_sais_pas"),
    ),
  },
  // → step `formation_onisep` partagé : tester_orientation, experience_terrain, preparer_reconversion.
  {
    id: "precision_formation_onisep",
    route: "/quiz/precision-formation-onisep",
    condition: or(
      screenAnswer("motivation", "motivation.tester_orientation"),
      screenAnswer("motivation", "motivation.experience_terrain"),
      screenAnswer("motivation", "motivation.preparer_reconversion"),
    ),
  },
  // → step `competence_rome` partagé : booster_cv, enrichir_cv, competences_interet_general.
  {
    id: "precision_competences",
    route: "/quiz/precision-competences",
    condition: or(
      screenAnswer("motivation", "motivation.booster_cv"),
      screenAnswer("motivation", "motivation.enrichir_cv"),
      screenAnswer("motivation", "motivation.competences_interet_general"),
    ),
  },
  // → reprendre_activite (demandeur d'emploi) : mapping référentiel ROME (secteurs d'activité).
  {
    id: "precision_reprendre_activite",
    route: "/quiz/precision-reprendre-activite",
    condition: screenAnswer("motivation", "motivation.reprendre_activite"),
  },
  // → servir_le_pays (toutes branches applicables).
  {
    id: "precision_servir_pays",
    route: "/quiz/precision-servir-pays",
    condition: screenAnswer("motivation", "motivation.servir_le_pays"),
  },
  // → partir_etranger (étudiant + actif), masqué si `type_mission = ponctuelle` (règle produit).
  {
    id: "precision_international",
    route: "/quiz/precision-international",
    condition: and(screenAnswer("motivation", "motivation.partir_etranger"), not(screenAnswer("duree", "type_mission.ponctuelle"))),
  },
];
