import type { QuizOptionKey } from "~/config/quiz-options";
import { type Condition } from "~/utils/conditions";

// Union exhaustive des steps du quiz, toutes versions de parcours confondues (cf. index.ts).
export type StepId =
  // Steps nommés comme leur taxonomy ("equipe" n'est plus que dans q3, conservé pour rollback).
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
  | "autonomie"
  // Page email avant les résultats (q4).
  | "email";

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
