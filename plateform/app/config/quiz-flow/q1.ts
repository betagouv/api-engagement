import { and, not, numericRange, or, screenAnswer } from "~/utils/conditions";
import type { StepDef } from "./types";

// Parcours v1 (identifiant "q1") — conservé tel quel pour pouvoir rollback (cf. QUIZ_FLOW_VERSION dans index.ts).
// Séquence et conditions de visibilité des steps.
// Le wording et les options de chaque step vivent dans le step component correspondant.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW_Q1: StepDef[] = [
  // Étape 1 — age.
  { id: "age", route: "/quiz/age", title: "Quel âge as-tu ?" },
  // Étape 2 — handicap.
  { id: "handicap", route: "/quiz/handicap", title: "Es-tu en situation de handicap reconnue ?", condition: numericRange("age", 26, 30) },
  // Étape 3 — statut.
  { id: "statut", route: "/quiz/statut", title: "Que fais-tu en ce moment ?" },
  // Étape 4 — localisation.
  { id: "localisation", route: "/quiz/localisation", title: "Où veux-tu chercher des missions ?" },
  // Étape 5 — duree.
  { id: "duree", route: "/quiz/duree", title: "Combien de temps aimerais-tu consacrer à ta mission ?" },
  // Étape 6 — motivation. Les options sont filtrées dans le step via `hiddenIf` selon la réponse à `statut`.
  { id: "motivation", route: "/quiz/motivation", title: "Qu’est-ce qui te motive le plus ?" },

  // Étape 7 — précisions sur la motivation (embranchement).
  // → me_sentir_utile (toutes branches) : mapping référentiel `engagement_intent`.
  {
    id: "precision_thematique",
    route: "/quiz/precision-thematique",
    title: "Parmi ces choix, quelle thématique te parle le plus ?",
    condition: or(screenAnswer("motivation", "me_sentir_utile"), screenAnswer("motivation", "reprendre_confiance")),
  },
  // → booster_parcoursup (lyceen) : 2 sous-steps avant le step domaine commun.
  {
    id: "precision_parcoursup_formation",
    route: "/quiz/precision-parcoursup-formation",
    title: "As-tu déjà une formation précise en tête ?",
    condition: screenAnswer("motivation", "booster_parcoursup"),
  },
  {
    id: "precision_parcoursup_formation_nom",
    route: "/quiz/precision-parcoursup-formation-nom",
    title: "Indique le nom de la formation",
    condition: and(screenAnswer("motivation", "booster_parcoursup"), screenAnswer("precision_parcoursup_formation", "oui")),
  },
  // → step `domaine` partagé : decouvrir_domaine, booster_parcoursup, ne_sais_pas. Titre adapté au contexte dans le step.
  {
    id: "precision_domaine",
    route: "/quiz/precision-domaine",
    title: "Dans quel domaine aimerais-tu avoir une expérience ?",
    condition: or(screenAnswer("motivation", "decouvrir_domaine"), screenAnswer("motivation", "booster_parcoursup"), screenAnswer("motivation", "ne_sais_pas")),
  },
  // → step `formation_onisep` partagé : tester_orientation, experience_terrain, preparer_reconversion.
  {
    id: "precision_formation_onisep",
    route: "/quiz/precision-formation-onisep",
    title: "Vers quoi veux-tu t'orienter ?",
    condition: or(screenAnswer("motivation", "tester_orientation"), screenAnswer("motivation", "experience_terrain"), screenAnswer("motivation", "preparer_reconversion")),
  },
  // → step `competence_rome` partagé : booster_cv, enrichir_cv, competences_interet_general.
  {
    id: "precision_competences",
    route: "/quiz/precision-competences",
    title: "Quel domaine de compétences t'attire le plus ?",
    condition: or(screenAnswer("motivation", "booster_cv"), screenAnswer("motivation", "enrichir_cv"), screenAnswer("motivation", "competences_interet_general")),
  },
  // → reprendre_activite (demandeur d'emploi) : mapping référentiel ROME (secteurs d'activité).
  {
    id: "precision_reprendre_activite",
    route: "/quiz/precision-reprendre-activite",
    title: "Quel secteur d'activité t'attirerait le plus ?",
    condition: screenAnswer("motivation", "reprendre_activite"),
  },
  // → servir_le_pays (toutes branches applicables).
  {
    id: "precision_servir_pays",
    route: "/quiz/precision-servir-pays",
    title: "Quel type d'engagement pourrait t'intéresser le plus ?",
    condition: screenAnswer("motivation", "servir_le_pays"),
  },
  // → partir_etranger (étudiant + actif), masqué si `type_mission = ponctuelle` (règle produit).
  {
    id: "precision_international",
    route: "/quiz/precision-international",
    title: "Dans quelle région du monde souhaiterais-tu partir ?",
    condition: and(screenAnswer("motivation", "partir_etranger"), not(screenAnswer("duree", "ponctuelle"))),
  },
];
