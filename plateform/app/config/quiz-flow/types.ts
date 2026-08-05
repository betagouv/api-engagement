import { type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz, toutes versions de parcours confondues (cf. index.ts).
export type StepId =
  // Steps du parcours v2 (q2) — nommés comme leur taxonomy.
  | "age"
  | "tranche_age"
  | "handicap"
  | "localisation"
  | "mobilite"
  | "motivation_recherche"
  | "rythme"
  | "domaine_engagement"
  | "activite"
  | "equipe"
  | "interaction"
  | "autonomie"
  | "imprevu"
  // Steps du parcours v1 (q1), conservés pour rollback.
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
