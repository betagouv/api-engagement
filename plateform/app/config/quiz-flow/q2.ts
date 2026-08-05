import { numericRange } from "~/utils/conditions";
import type { StepDef } from "./types";

// Parcours v2 (identifiant "q2") — steps nommés comme leur taxonomy.
// Séquence, wording (titres/sous-titres) et conditions de visibilité des steps.
// Les options de chaque step vivent dans le step component correspondant.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW_Q2: StepDef[] = [
  // Étape 1 — âge.
  { id: "age", route: "/quiz/age", title: "Quel âge as-tu ?", subtitle: "Certaines missions dépendent de l'âge." },
  // Étape 2 — handicap, posée uniquement entre 26 et 30 ans.
  {
    id: "handicap",
    route: "/quiz/handicap",
    title: "Es-tu en situation de handicap reconnue ?",
    subtitle: "Certaines missions sont accessibles jusqu’à 30 ans pour les personnes en situation de handicap.",
    condition: numericRange("age", 26, 30),
  },
  // Étape 3 — localisation.
  {
    id: "localisation",
    route: "/quiz/localisation",
    title: "Où veux-tu chercher des missions ?",
    subtitle: "Entre ton adresse pour découvrir les missions près de chez toi. Certaines missions peuvent aussi se faire à distance.",
  },
  // Étape 4 — mobilité, calibre le rayon de recherche autour de la localisation.
  { id: "mobilite", route: "/quiz/mobilite", title: "Comment tu te déplaces généralement ?" },
  // Étape 5 — motivation de recherche.
  { id: "motivation_recherche", route: "/quiz/motivation-recherche", title: "Qu’est-ce qui t’amène aujourd’hui ?" },
  // Étape 6 — rythme.
  { id: "rythme", route: "/quiz/rythme", title: "Quel rythme te conviendrait le mieux ?" },
  // Étape 7 — domaines d'engagement.
  { id: "domaine_engagement", route: "/quiz/domaine-engagement", title: "Quels domaines t’intéressent ?" },
  // Étape 8 — activités.
  { id: "activite", route: "/quiz/activite", title: "Qu’aimerais-tu faire concrètement ?" },
  // Étape 9 — équipe.
  { id: "equipe", route: "/quiz/equipe", title: "Dans quel type d’équipe te sentirais-tu le plus à l’aise ?" },
  // Étape 10 — interaction.
  { id: "interaction", route: "/quiz/interaction", title: "Comment préfères-tu participer ?" },
  // Étape 11 — autonomie.
  { id: "autonomie", route: "/quiz/autonomie", title: "Quel cadre te conviendrait le mieux ?" },
  // Étape 12 — imprévu.
  { id: "imprevu", route: "/quiz/imprevu", title: "Quel niveau d’imprévu te conviendrait le mieux ?" },
];
