import type { StepId } from "~/config/quiz-flow";
import type { Condition } from "~/utils/conditions";

// Réponse stockée pour un step — union discriminée par `type`.
// - options  : sélection d'option_ids (single/multi)
// - numeric  : valeur brute (ex: age), utilisée uniquement dans les conditions
// - location : coordonnées géographiques (LocalisationStep)
export type ScreenAnswer =
  | { type: "options"; option_ids: string[] }
  | { type: "numeric"; value: number }
  | { type: "location"; lat: number; lon: number }
  | { type: "text"; value: string };

export type QuizAnswers = Partial<Record<StepId, ScreenAnswer>>;

// Option d'un step de type select (single ou multi).
// `taxonomyKey` est l'identifiant canonique (namespace.key) utilisé à la fois
// comme clé React, valeur stockée dans `option_ids`, et payload /user-scoring.
// Le catalogue des options vit dans `~/config/quiz-options`.
export interface StepOption {
  label: string;
  sublabel?: string;
  icon?: string;
  taxonomyKey: string;
  hiddenIf?: Condition;
}

// DTO retourné par l'API /v0/mission.
export type Mission = {
  _id: string;
  title: string;
  description: string;
  city?: string;
  department?: string;
  organizationName: string;
  applicationUrl: string;
  domaine?: string;
};
