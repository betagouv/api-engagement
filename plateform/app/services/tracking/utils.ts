import { QUIZ_FLOW, type StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";

import type { EmailMissionDetailEntrySource, MissionDetailEntrySource, QuizEntrySource } from "./types";

// ============================================================================
// Helpers quiz (réponses / parcours)
// ============================================================================

// Première option sélectionnée pour un step de type "options" (sinon null).
export function optionAnswer(answers: QuizAnswers, stepId: StepId): string | null {
  const answer = answers[stepId];
  return answer?.type === "options" ? (answer.option_ids[0] ?? null) : null;
}

// Chemin synthétique : pour chaque step répondu (dans l'ordre du flow), toutes les valeurs
// sélectionnées concaténées par "-", les steps étant séparés par ">" (ex. "lyceen>sante-education").
export function buildQuizPath(answers: QuizAnswers): string {
  return QUIZ_FLOW.map((step) => {
    const answer = answers[step.id];
    return answer?.type === "options" && answer.option_ids.length > 0 ? answer.option_ids.join("-") : null;
  })
    .filter((segment): segment is string => segment !== null)
    .join(">");
}

// Nombre d'étapes du flow ayant une réponse.
export function countAnsweredSteps(answers: QuizAnswers): number {
  return QUIZ_FLOW.filter((step) => answers[step.id] !== undefined).length;
}

// Tranche d'âge produit calculée à partir de l'âge saisi.
export function getAgeBracket(age: number): string {
  if (age <= 18) return "16-18";
  if (age <= 25) return "19-25";
  if (age <= 35) return "26-35";
  if (age <= 50) return "36-50";
  return "51+";
}

// Steps dont la réponse n'est pas remontée dans answer_value (non catégoriels ou sensibles).
export const ANSWER_VALUE_EXCLUDED_STEPS = new Set<StepId>(["age", "localisation", "handicap"]);

// ============================================================================
// Résolveurs d'entry_source
// ============================================================================

const QUIZ_ENTRY_SOURCES = new Set<QuizEntrySource>(["homepage_cta", "direct", "missions_list", "change_results_cta", "external"]);

// Priorité à l'état de navigation (CTA in-app qui le transmet), sinon on déduit direct/external
// depuis le referrer du document. (Le referrer ne reflète pas la navigation SPA interne, d'où le
// besoin du state pour les CTA in-app.)
export function resolveQuizEntrySource(stateHint?: string | null): QuizEntrySource {
  if (stateHint && QUIZ_ENTRY_SOURCES.has(stateHint as QuizEntrySource)) return stateHint as QuizEntrySource;
  if (typeof document === "undefined") return "direct";
  const referrer = document.referrer;
  if (!referrer) return "direct";
  try {
    return new URL(referrer).origin === window.location.origin ? "direct" : "external";
  } catch {
    return "direct";
  }
}

const MISSION_DETAIL_ENTRY_SOURCES = new Set<MissionDetailEntrySource>(["results_pinned", "results_other", "missions_list", "homepage", "direct"]);

export function resolveMissionDetailEntrySource(stateHint?: string | null): MissionDetailEntrySource {
  return stateHint && MISSION_DETAIL_ENTRY_SOURCES.has(stateHint as MissionDetailEntrySource) ? (stateHint as MissionDetailEntrySource) : "direct";
}

export function resolveEmailMissionDetailEntrySource(navStateHint: string | null | undefined, hasUserScoringId: boolean): EmailMissionDetailEntrySource {
  if (navStateHint === "results_pinned" || navStateHint === "results_other") return "results";
  if (navStateHint === "missions_list") return "missions_list";
  if (hasUserScoringId) return "results";
  return "direct";
}
