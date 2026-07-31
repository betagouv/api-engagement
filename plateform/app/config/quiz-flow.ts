import { numericRange, type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz.
// Les ids du parcours v1 (statut, duree, motivation, precision_*) sont conservés :
// leurs steps existent toujours dans routes/quiz/ mais ne font plus partie du flow v2.
export type StepId =
  | "age"
  | "tranche_age"
  | "handicap"
  | "localisation"
  | "mobilite"
  | "motivations"
  | "rythme"
  | "domaines"
  | "activites"
  | "equipe"
  | "interaction"
  | "autonomie"
  | "imprevu"
  | "statut"
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
  // Titre de la question : affiché dans le step (via getStepDef) et utilisé pour le <title> de la page (RGAA 8.6).
  title: string;
  // Sous-titre optionnel affiché sous le titre du step.
  subtitle?: string;
  condition?: Condition;
}

// Séquence, wording (titres/sous-titres) et conditions de visibilité des steps (parcours v2).
// Les options de chaque step vivent dans le step component correspondant.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW: StepDef[] = [
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
  // Étape 5 — motivations.
  { id: "motivations", route: "/quiz/motivations", title: "Qu’est-ce qui t’amène aujourd’hui ?" },
  // Étape 6 — rythme.
  { id: "rythme", route: "/quiz/rythme", title: "Quel rythme te conviendrait le mieux ?" },
  // Étape 7 — domaines.
  { id: "domaines", route: "/quiz/domaines", title: "Quels domaines t’intéressent ?" },
  // Étape 8 — activités.
  { id: "activites", route: "/quiz/activites", title: "Qu’aimerais-tu faire concrètement ?" },
  // Étape 9 — équipe.
  { id: "equipe", route: "/quiz/equipe", title: "Dans quel type d’équipe te sentirais-tu le plus à l’aise ?" },
  // Étape 10 — interaction.
  { id: "interaction", route: "/quiz/interaction", title: "Comment préfères-tu participer ?" },
  // Étape 11 — autonomie.
  { id: "autonomie", route: "/quiz/autonomie", title: "Quel cadre te conviendrait le mieux ?" },
  // Étape 12 — imprévu.
  { id: "imprevu", route: "/quiz/imprevu", title: "Quel niveau d’imprévu te conviendrait le mieux ?" },
];

// Définition d'un step du flow — utilisé par les step components pour afficher titre/sous-titre.
export const getStepDef = (id: StepId): StepDef => {
  const step = QUIZ_FLOW.find((s) => s.id === id);
  if (!step) throw new Error(`Step absent de QUIZ_FLOW : ${id}`);
  return step;
};
