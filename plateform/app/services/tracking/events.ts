import type { MissionBrowse, MissionMatchItem } from "@engagement/dto";

import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";

import { track } from "./index";
import type {
  EmailMissionDetailEntrySource,
  EventCategory,
  MissionClickedEntryPage,
  MissionClickedPayload,
  MissionClickedSection,
  MissionDetailEntrySource,
  MissionsFilterType,
  QuizCompletionType,
  QuizEntrySource,
} from "./types";
import { ANSWER_VALUE_EXCLUDED_STEPS, buildQuizPath, countAnsweredSteps, getAgeBracket, optionAnswer } from "./utils";

// Catalogue des évènements métier tracés côté front : nom de l'évènement + forme des propriétés
// (spec produit, propriétés en snake_case côté PostHog). Les types vivent dans ./types, les helpers
// dans ./utils.
//
// Note : distinct_id, quiz_attempt_id et quiz_session_id sont des super properties PostHog attachées
// automatiquement à TOUS les évènements (cf. tracking/index.ts) — inutile de les répéter ici.
// Les propriétés optionnelles peuvent être passées à `undefined` : `track()` retire les clés vides.

// Catégorie de chaque évènement (documentation/priorisation, non transmise à PostHog).
export const EVENT_CATALOG = {
  "quiz.started": "lifecycle",
  "quiz.step_completed": "core_value",
  "quiz.completed": "core_value",
  "quiz.shortcut_taken": "feature_usage",
  "quiz.back_navigated": "feature_usage",
  "results.viewed": "core_value",
  "mission.clicked": "core_value",
  "mission_detail.viewed": "feature_usage",
  "missions_filter.applied": "feature_usage",
  "email_missions.sent": "feature_usage",
  "email_mission_detail.sent": "feature_usage",
} satisfies Record<string, EventCategory>;

// ============================================================================
// mission.clicked
// ============================================================================

// `mission.clicked` (core_value) : clic sur une carte mission (résultats, liste, homepage, similarité).
function trackMissionClicked(payload: MissionClickedPayload): void {
  track("mission.clicked", { ...payload });
}

// Clic depuis un résultat de matching (sections pinned / other / similar) : navigation interne
// vers le détail → `opens_external: false`.
export function trackMissionClickedFromMatch(
  item: MissionMatchItem,
  context: {
    section: Extract<MissionClickedSection, "pinned" | "other" | "similar">;
    entryPage: MissionClickedEntryPage;
    rank: number | null;
  },
): void {
  trackMissionClicked({
    mission_id: item.mission.id,
    publisher_id: item.mission.publisherId ?? "",
    publisher_name: item.mission.publisherName ?? "",
    section: context.section,
    rank: context.rank,
    mission_domain: item.mission.domain,
    mission_type: item.match.values.find((value) => value.taxonomyKey === "type_mission")?.taxonomyValueKey ?? null,
    opens_external: false,
    // Spec : distance pertinente uniquement pour les sections pinned/other (résultats géolocalisés).
    distance_km: context.section === "similar" ? null : (item.mission.location.distanceKm ?? null),
    entry_page: context.entryPage,
  });
}

// Clic depuis une mission "browse" (liste /missions ou exemples de la homepage).
export function trackMissionClickedFromBrowse(
  mission: MissionBrowse,
  context: {
    section: Extract<MissionClickedSection, "missions_list" | "homepage_examples">;
    entryPage: MissionClickedEntryPage;
    opensExternal: boolean;
  },
): void {
  trackMissionClicked({
    mission_id: mission.id,
    publisher_id: mission.publisherId ?? "",
    publisher_name: mission.publisherName ?? "",
    section: context.section,
    // Listes non classées (spec) → rank null.
    rank: null,
    mission_domain: mission.domain,
    // Pas de scoring sur le flux browse → type_mission indisponible ici.
    mission_type: null,
    opens_external: context.opensExternal,
    distance_km: null,
    entry_page: context.entryPage,
  });
}

// ============================================================================
// Évènements quiz
// ============================================================================

// `quiz.started` (lifecycle) : chargement de /quiz/age, début d'une tentative.
export function trackQuizStarted(params: { entrySource: QuizEntrySource }): void {
  track("quiz.started", { entry_source: params.entrySource });
}

// `quiz.step_completed` (core_value) : à chaque validation d'étape (goNext).
export function trackQuizStepCompleted(params: { stepName: StepId; answers: QuizAnswers; stepIndex: number; totalVisibleSteps: number }): void {
  const answer = params.answers[params.stepName];
  // answer_value uniquement pour les étapes catégorielles non sensibles (omis pour age/localisation/handicap).
  // Multi-sélection → tableau de toutes les valeurs ; sélection unique → chaîne simple ; sinon undefined (clé omise).
  let answerValue: string | string[] | undefined;
  if (!ANSWER_VALUE_EXCLUDED_STEPS.has(params.stepName) && answer?.type === "options" && answer.option_ids.length > 0) {
    answerValue = answer.option_ids.length === 1 ? answer.option_ids[0] : answer.option_ids;
  }

  track("quiz.step_completed", {
    step_name: params.stepName,
    quiz_path: buildQuizPath(params.answers),
    step_index: params.stepIndex,
    total_visible_steps: params.totalVisibleSteps,
    answer_value: answerValue,
  });
}

// `quiz.completed` (core_value) : fin du quiz, à l'arrivée sur les résultats.
export function trackQuizCompleted(params: { answers: QuizAnswers; completionType: QuizCompletionType; quizStartedAt: number }): void {
  const { answers } = params;
  const ageAnswer = answers["age"];
  const age = ageAnswer?.type === "numeric" ? ageAnswer.value : null;

  track("quiz.completed", {
    completion_type: params.completionType,
    quiz_path: buildQuizPath(answers),
    steps_completed_count: countAnsweredSteps(answers),
    has_localisation: answers["localisation"]?.type === "params",
    statut: optionAnswer(answers, "statut"),
    motivation: optionAnswer(answers, "motivation"),
    age_bracket: age !== null ? getAgeBracket(age) : null,
    quiz_duration_ms: Date.now() - params.quizStartedAt,
  });
}

// `quiz.shortcut_taken` (feature_usage) : clic sur "Voir mes résultats" (raccourci depuis une étape).
export function trackQuizShortcutTaken(params: { fromStepName: StepId; fromStepIndex: number; answers: QuizAnswers }): void {
  track("quiz.shortcut_taken", {
    from_step_name: params.fromStepName,
    from_step_index: params.fromStepIndex,
    steps_completed_count: countAnsweredSteps(params.answers),
  });
}

// `quiz.back_navigated` (feature_usage) : clic sur le bouton "Retour" dans le quiz.
export function trackQuizBackNavigated(params: { fromStepName: StepId; fromStepIndex: number }): void {
  track("quiz.back_navigated", {
    from_step_name: params.fromStepName,
    from_step_index: params.fromStepIndex,
  });
}

// ============================================================================
// results.viewed
// ============================================================================

// `results.viewed` (core_value) : chargement de la page /results avec ses missions.
export function trackResultsViewed(params: { pinnedCount: number; totalResultsCount: number; avgDistanceKmTop5?: number | null }): void {
  track("results.viewed", {
    has_results: params.pinnedCount > 0,
    pinned_count: params.pinnedCount,
    total_results_count: params.totalResultsCount,
    avg_distance_km_top5: params.avgDistanceKmTop5 ?? null,
  });
}

// ============================================================================
// mission_detail.viewed
// ============================================================================

// `mission_detail.viewed` (feature_usage) : chargement de la fiche d'une mission.
export function trackMissionDetailViewed(params: {
  missionId: string;
  publisherId: string;
  publisherName: string;
  entrySource: MissionDetailEntrySource;
  rank?: number | null;
}): void {
  track("mission_detail.viewed", {
    mission_id: params.missionId,
    publisher_id: params.publisherId,
    publisher_name: params.publisherName,
    entry_source: params.entrySource,
    // rank pertinent uniquement pour les sources results_* → sinon clé omise.
    rank: params.rank ?? undefined,
  });
}

// ============================================================================
// missions_filter.applied
// ============================================================================

// `missions_filter.applied` (feature_usage) : sélection d'une valeur de filtre sur /missions.
export function trackMissionsFilterApplied(params: { filterType: MissionsFilterType; filterValue: string; activeFilterCount: number }): void {
  track("missions_filter.applied", {
    filter_type: params.filterType,
    filter_value: params.filterValue,
    active_filter_count: params.activeFilterCount,
  });
}

// ============================================================================
// Emails
// ============================================================================

// `email_missions.sent` (feature_usage) : envoi par email des 5 missions recommandées (modale résultats).
export function trackEmailMissionsSent(params: { hasAlertOptIn: boolean }): void {
  track("email_missions.sent", { has_alert_opt_in: params.hasAlertOptIn });
}

// `email_mission_detail.sent` (feature_usage) : envoi par email d'une seule mission (modale détail).
export function trackEmailMissionDetailSent(params: { missionId: string; publisherId: string; entrySource: EmailMissionDetailEntrySource; hasAlertOptIn: boolean }): void {
  track("email_mission_detail.sent", {
    mission_id: params.missionId,
    publisher_id: params.publisherId,
    entry_source: params.entrySource,
    has_alert_opt_in: params.hasAlertOptIn,
  });
}
