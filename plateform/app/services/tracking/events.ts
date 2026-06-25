import type { MissionBrowse, MissionMatchItem } from "@engagement/dto";

import { QUIZ_FLOW, type StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";

import { track } from "./index";
import type { TrackingProperties } from "./types";

// Catalogue des évènements métier tracés côté front. Centralise le nom de l'évènement et la forme
// de ses propriétés (spec produit, propriétés en snake_case côté PostHog).

// Catégories du plan de télémétrie. Convention de documentation et de priorisation UNIQUEMENT :
// elles ne sont pas envoyées à PostHog (PostHog n'a pas de notion native de catégorie).
//   - lifecycle    : début/fin d'un parcours utilisateur (ex. quiz.started, évènement de référence)
//   - core_value   : actions cœur de la plateforme (quiz.completed, results.viewed, mission.clicked)
//   - feature_usage: fonctionnalités secondaires (filtres, emails, navigation détail, raccourcis)
// Ordre d'implémentation : lifecycle + core_value d'abord, feature_usage ensuite.
export type EventCategory = "lifecycle" | "core_value" | "feature_usage";

// Associe chaque évènement du plan à sa catégorie (référence documentaire, non transmise).
export const EVENT_CATALOG = {
  "quiz.started": "lifecycle",
  "quiz.step_completed": "core_value",
  "quiz.completed": "core_value",
  "results.viewed": "core_value",
  "mission.clicked": "core_value",
  // feature_usage (filtres, emails, navigation détail, raccourcis) : à cataloguer à l'implémentation.
} satisfies Record<string, EventCategory>;

// Surface d'où provient le clic sur une carte mission.
export type MissionClickedSection = "pinned" | "other" | "homepage_examples" | "missions_list" | "similar";
// Page sur laquelle se trouve l'utilisateur au moment du clic.
export type MissionClickedEntryPage = "results" | "homepage" | "missions_list";

interface MissionClickedPayload {
  mission_id: string;
  publisher_id: string;
  publisher_name: string;
  section: MissionClickedSection;
  // Position ordinale dans la liste affichée (1 = première). Null pour les listes non classées.
  rank: number | null;
  mission_domain: string | null;
  // Valeur de la taxonomie `type_mission` (ponctuelle, reguliere, temps_plein, ...).
  mission_type: string | null;
  // true si le clic mène vers le site annonceur externe (et non vers le détail interne).
  opens_external: boolean;
  // Distance user ↔ mission fournie par le backend. Null hors sections pinned/other.
  distance_km: number | null;
  entry_page: MissionClickedEntryPage;
}

// Note : distinct_id, quiz_attempt_id et quiz_session_id sont des super properties PostHog
// attachées automatiquement à tous les évènements (cf. tracking/index.ts) — inutile de les
// répéter dans les payloads ci-dessous.

// `mission.clicked` : clic sur une carte mission (résultats, liste, homepage, similarité).
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

// `results.viewed` (core_value) : chargement de la page /results avec ses missions.
export function trackResultsViewed(params: { pinnedCount: number; totalResultsCount: number; avgDistanceKmTop5?: number | null }): void {
  track("results.viewed", {
    has_results: params.pinnedCount > 0,
    pinned_count: params.pinnedCount,
    total_results_count: params.totalResultsCount,
    avg_distance_km_top5: params.avgDistanceKmTop5 ?? null,
  });
}

// Provenance de l'entrée dans le quiz.
export type QuizEntrySource = "homepage_cta" | "direct" | "missions_list" | "change_results_cta" | "external";

const QUIZ_ENTRY_SOURCES = new Set<QuizEntrySource>(["homepage_cta", "direct", "missions_list", "change_results_cta", "external"]);

// Résout l'entry_source : priorité à l'état de navigation (CTA in-app qui le transmet), sinon on
// déduit direct/external depuis le referrer du document. (Le referrer ne reflète pas la navigation
// SPA interne, d'où le besoin du state pour les CTA in-app.)
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

// `quiz.started` (lifecycle) : chargement de /quiz/age, début d'une tentative.
// quiz_attempt_id est attaché automatiquement (super property).
export function trackQuizStarted(params: { entrySource: QuizEntrySource }): void {
  track("quiz.started", { entry_source: params.entrySource });
}

// Mode de complétion du quiz : "full" (l'utilisateur a parcouru jusqu'au bout) ou "shortcut"
// (bouton "Voir les missions sans répondre à toutes les questions").
export type QuizCompletionType = "full" | "shortcut";

// Tranche d'âge produit calculée à partir de l'âge saisi.
function getAgeBracket(age: number): string {
  if (age <= 18) return "16-18";
  if (age <= 25) return "19-25";
  if (age <= 35) return "26-35";
  if (age <= 50) return "36-50";
  return "51+";
}

// Première option sélectionnée pour un step de type "options" (sinon null).
function optionAnswer(answers: QuizAnswers, stepId: StepId): string | null {
  const answer = answers[stepId];
  return answer?.type === "options" ? (answer.option_ids[0] ?? null) : null;
}

// Chemin synthétique : pour chaque step répondu (dans l'ordre du flow), toutes les valeurs
// sélectionnées concaténées par "-", les steps étant séparés par ">" (ex. "lyceen>sante-education").
function buildQuizPath(answers: QuizAnswers): string {
  return QUIZ_FLOW.map((step) => {
    const answer = answers[step.id];
    return answer?.type === "options" && answer.option_ids.length > 0 ? answer.option_ids.join("-") : null;
  })
    .filter((segment): segment is string => segment !== null)
    .join(">");
}

// Steps dont la réponse n'est pas remontée dans answer_value (non catégoriels ou sensibles).
const ANSWER_VALUE_EXCLUDED_STEPS = new Set<StepId>(["age", "localisation", "handicap"]);

// `quiz.completed` (core_value) : fin du quiz, à l'arrivée sur les résultats.
// quiz_attempt_id et quiz_session_id sont attachés automatiquement (super properties).
export function trackQuizCompleted(params: { answers: QuizAnswers; completionType: QuizCompletionType; quizStartedAt: number }): void {
  const { answers } = params;
  const ageAnswer = answers["age"];
  const age = ageAnswer?.type === "numeric" ? ageAnswer.value : null;

  track("quiz.completed", {
    completion_type: params.completionType,
    quiz_path: buildQuizPath(answers),
    steps_completed_count: QUIZ_FLOW.filter((step) => answers[step.id] !== undefined).length,
    has_localisation: answers["localisation"]?.type === "params",
    statut: optionAnswer(answers, "statut"),
    motivation: optionAnswer(answers, "motivation"),
    age_bracket: age !== null ? getAgeBracket(age) : null,
    quiz_duration_ms: Date.now() - params.quizStartedAt,
  });
}

// `quiz.step_completed` (core_value) : à chaque validation d'étape (goNext).
// quiz_attempt_id est attaché automatiquement (super property).
export function trackQuizStepCompleted(params: { stepName: StepId; answers: QuizAnswers; stepIndex: number; totalVisibleSteps: number }): void {
  const answer = params.answers[params.stepName];
  // answer_value uniquement pour les étapes catégorielles non sensibles (omis pour age/localisation/handicap).
  // Multi-sélection → tableau de toutes les valeurs ; sélection unique → chaîne simple.
  let answerValue: string | string[] | undefined;
  if (!ANSWER_VALUE_EXCLUDED_STEPS.has(params.stepName) && answer?.type === "options" && answer.option_ids.length > 0) {
    answerValue = answer.option_ids.length === 1 ? answer.option_ids[0] : answer.option_ids;
  }

  const properties: TrackingProperties = {
    step_name: params.stepName,
    quiz_path: buildQuizPath(params.answers),
    step_index: params.stepIndex,
    total_visible_steps: params.totalVisibleSteps,
  };
  // Omis (pas de clé) quand non applicable, plutôt que `answer_value: undefined`.
  if (answerValue !== undefined) properties.answer_value = answerValue;

  track("quiz.step_completed", properties);
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
