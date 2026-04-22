import { and, anyScreenHasAnswer, not, numericRange, or, screenAnswer, type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz.
// À étendre au fil des PR (autres precision_*, etc.).
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
  | "motivation_autres"
  | "precision_domaine_aide"
  | "precision_parcoursup_formation"
  | "precision_parcoursup_formation_nom"
  | "precision_parcoursup_domaine"
  | "precision_orientation_rome"
  | "precision_competences"
  | "precision_competences_actuelles"
  | "precision_decouvrir_domaine"
  | "precision_experience_terrain"
  | "precision_reprendre_activite"
  | "precision_reconversion"
  | "precision_indecision"
  | "precision_servir_pays"
  | "precision_international";

export interface StepDef {
  id: StepId;
  route: string;
  condition?: Condition;
}

// Réutilisé dans plusieurs conditions cross-branches.
const ALL_MOTIVATIONS: StepId[] = ["motivation_lyceen", "motivation_etudiant", "motivation_demandeur_emploi", "motivation_actif", "motivation_autres"];

// Motivations partagées par étudiant + actif (booster_cv, decouvrir_domaine, partir_etranger).
const ETUDIANT_ACTIF: StepId[] = ["motivation_etudiant", "motivation_actif"];

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
  // Étape 6 — embranchement motivation (un seul des 5 visible selon `statut`).
  { id: "motivation_lyceen", route: "/quiz/motivation-lyceen", condition: screenAnswer("statut", "lyceen") },
  { id: "motivation_etudiant", route: "/quiz/motivation-etudiant", condition: screenAnswer("statut", "etudiant") },
  { id: "motivation_demandeur_emploi", route: "/quiz/motivation-demandeur-emploi", condition: screenAnswer("statut", "demandeur_emploi") },
  { id: "motivation_actif", route: "/quiz/motivation-actif", condition: screenAnswer("statut", "actif") },
  { id: "motivation_autres", route: "/quiz/motivation-autres", condition: or(screenAnswer("statut", "autre"), screenAnswer("statut", "retraite")) },

  // Étape 7 — précisions sur la motivation (embranchement).
  // → me_sentir_utile (toutes branches) : mapping référentiel `engagement_intent`.
  {
    id: "precision_domaine_aide",
    route: "/quiz/precision-domaine-aide",
    condition: anyScreenHasAnswer(ALL_MOTIVATIONS, "me_sentir_utile"),
  },
  // → booster_parcoursup (lyceen uniquement) : 3 sous-steps.
  {
    id: "precision_parcoursup_formation",
    route: "/quiz/precision-parcoursup-formation",
    condition: screenAnswer("motivation_lyceen", "booster_parcoursup"),
  },
  {
    id: "precision_parcoursup_formation_nom",
    route: "/quiz/precision-parcoursup-formation-nom",
    condition: and(screenAnswer("motivation_lyceen", "booster_parcoursup"), screenAnswer("precision_parcoursup_formation", "oui")),
  },
  {
    id: "precision_parcoursup_domaine",
    route: "/quiz/precision-parcoursup-domaine",
    condition: screenAnswer("motivation_lyceen", "booster_parcoursup"),
  },
  // → tester_orientation (lyceen uniquement) : mapping ONISEP.
  {
    id: "precision_orientation_rome",
    route: "/quiz/precision-orientation-rome",
    condition: screenAnswer("motivation_lyceen", "tester_orientation"),
  },

  // → booster_cv (étudiant + actif) ou enrichir_cv (demandeur_emploi) : mapping référentiel ROME (compétences).
  // Même question pour les deux options (libellés différents selon le statut, mais même axe de scoring).
  {
    id: "precision_competences",
    route: "/quiz/precision-competences",
    condition: or(anyScreenHasAnswer(ETUDIANT_ACTIF, "booster_cv"), screenAnswer("motivation_demandeur_emploi", "enrichir_cv")),
  },

  // → competences_interet_general (actif) : mapping référentiel ROME (compétences actuelles).
  // Sémantique distincte de `precision_competences` — ici on demande ce que l'user SAIT FAIRE
  // pour l'utiliser, pas ce qu'il veut développer. Namespace `competences_actuelles.*`.
  {
    id: "precision_competences_actuelles",
    route: "/quiz/precision-competences-actuelles",
    condition: screenAnswer("motivation_actif", "competences_interet_general"),
  },

  // → decouvrir_domaine (étudiant + actif) : mapping référentiel `domain`.
  {
    id: "precision_decouvrir_domaine",
    route: "/quiz/precision-decouvrir-domaine",
    condition: anyScreenHasAnswer(ETUDIANT_ACTIF, "decouvrir_domaine"),
  },

  // → experience_terrain (étudiant uniquement) : mapping ONISEP du domaine d'études.
  {
    id: "precision_experience_terrain",
    route: "/quiz/precision-experience-terrain",
    condition: screenAnswer("motivation_etudiant", "experience_terrain"),
  },

  // → reprendre_activite (demandeur d'emploi) : mapping référentiel ROME (secteurs d'activité).
  {
    id: "precision_reprendre_activite",
    route: "/quiz/precision-reprendre-activite",
    condition: screenAnswer("motivation_demandeur_emploi", "reprendre_activite"),
  },

  // → preparer_reconversion (demandeur d'emploi) : mapping ONISEP du domaine de reconversion visé.
  {
    id: "precision_reconversion",
    route: "/quiz/precision-reconversion",
    condition: screenAnswer("motivation_demandeur_emploi", "preparer_reconversion"),
  },

  // → ne_sais_pas (toutes branches applicables) : fallback — mapping `domain`.
  {
    id: "precision_indecision",
    route: "/quiz/precision-indecision",
    condition: anyScreenHasAnswer(ALL_MOTIVATIONS, "ne_sais_pas"),
  },

  // → servir_le_pays (toutes branches applicables).
  {
    id: "precision_servir_pays",
    route: "/quiz/precision-servir-pays",
    condition: anyScreenHasAnswer(ALL_MOTIVATIONS, "servir_le_pays"),
  },

  // → partir_etranger (étudiant + actif), masqué si `duree = ponctuelle` (règle produit).
  {
    id: "precision_international",
    route: "/quiz/precision-international",
    condition: and(anyScreenHasAnswer(ETUDIANT_ACTIF, "partir_etranger"), not(screenAnswer("duree", "ponctuelle"))),
  },
];
