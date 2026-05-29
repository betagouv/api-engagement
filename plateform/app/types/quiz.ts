import type { StepId } from "~/config/quiz-flow";
import type { Condition } from "~/utils/conditions";

// Réponse stockée pour un step — union discriminée par `type`.
// - options  : sélection d'option_ids (single/multi)
// - numeric  : valeur brute (ex: age), utilisée uniquement dans les conditions
// - location : coordonnées géographiques (LocalisationStep)
export type ScreenAnswer =
  | { type: "options"; taxonomy: string; option_ids: string[] }
  | { type: "numeric"; value: number }
  | { type: "params"; taxonomy: string; params: Record<string, unknown> }
  | { type: "text"; value: string };

export type QuizAnswers = Partial<Record<StepId, ScreenAnswer>>;

// Option d'un step de type select (single ou multi).
// Le catalogue des options vit dans `~/config/quiz-options`.
export interface StepOption {
  label: string;
  sublabel?: string;
  icon?: string;
  taxonomy: string;
  value: string;
  hiddenIf?: Condition;
  // true → option grisée et non sélectionnable (fonctionnalité pas encore disponible).
  disabled?: boolean;
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
