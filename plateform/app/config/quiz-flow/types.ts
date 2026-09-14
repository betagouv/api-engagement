import type { QuizOptionKey } from "~/config/quiz-options";
import { type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz, toutes versions de parcours confondues (cf. index.ts).
export type StepId =
  // Steps des parcours v2 (q2) et v3 (q3) — nommés comme leur taxonomy.
  // q3 = q2 sans les steps "interaction" et "imprevu", conservés ici pour rollback.
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
  // Réponses proposées, dans l'ordre d'affichage. Versionnées ici et non dans le step component :
  // les steps sont partagés entre les parcours, seul le flow sait ce que sa version propose.
  // Absent pour les steps sans liste d'options (age, localisation).
  options?: QuizOptionKey[];
  condition?: Condition;
}
