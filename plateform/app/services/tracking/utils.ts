import { QUIZ_FLOW, type StepId } from "~/config/quiz-flow";
import type { QuizAnswers, ScreenAnswer } from "~/types/quiz";

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

// Valeur remontée dans `answer_value` selon le type de réponse du step :
//   - options : valeur unique (sélection simple) ou tableau (multi-sélection) ; undefined si vide.
//   - numeric : nombre brut (ex. age).
//   - params  : `label` lisible (ex. localisation) ; les coordonnées/CP sont remontés à part via resolveGeoProps.
//   - text    : texte brut.
export function resolveAnswerValue(answer: ScreenAnswer | undefined): string | number | string[] | undefined {
  if (!answer) return undefined;
  switch (answer.type) {
    case "options":
      if (answer.option_ids.length === 0) return undefined;
      return answer.option_ids.length === 1 ? answer.option_ids[0] : answer.option_ids;
    case "numeric":
      return answer.value;
    case "params": {
      const label = (answer.params as { label?: unknown }).label;
      return typeof label === "string" && label ? label : undefined;
    }
    case "text":
      return answer.value || undefined;
  }
}

// Propriétés géo brutes remontées pour les steps de type "params" géolocalisés (ex. localisation),
// pour des analyses futures (distance, temps de trajet…). Générique : un step params sans lat/lon
// (ex. tranche_age) produit des valeurs undefined, filtrées par `track()` avant envoi.
export function resolveGeoProps(answer: ScreenAnswer | undefined): {
  geo_lat?: number;
  geo_lon?: number;
  geo_postcode?: string;
  geo_country_code?: string;
} {
  if (answer?.type !== "params") return {};
  const params = answer.params as { lat?: unknown; lon?: unknown; postcode?: unknown; country_code?: unknown };
  return {
    geo_lat: typeof params.lat === "number" ? params.lat : undefined,
    geo_lon: typeof params.lon === "number" ? params.lon : undefined,
    geo_postcode: typeof params.postcode === "string" ? params.postcode : undefined,
    geo_country_code: typeof params.country_code === "string" ? params.country_code : undefined,
  };
}

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
