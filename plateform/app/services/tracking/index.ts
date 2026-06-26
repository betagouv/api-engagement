import { TRACKING_PROVIDER } from "~/services/config";
import { useQuizStore } from "~/stores/quiz";

import { createProvider } from "./providers";
import type { TrackingProperties, TrackingProvider, TrackingProviderName, TrackingTraits } from "./types";

export type { TrackingProperties, TrackingProvider, TrackingProviderName, TrackingTraits } from "./types";

// Provider courant, instancié paresseusement à la première utilisation côté navigateur.
let provider: TrackingProvider | null = null;

// Le tracking est exclusivement côté client : on ne veut rien émettre pendant le rendu SSR.
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getProvider(): TrackingProvider | null {
  if (!isBrowser()) return null;
  if (!provider) {
    provider = createProvider(TRACKING_PROVIDER as TrackingProviderName);
    provider.init?.();
  }
  return provider;
}

// Super properties d'identité attachées à TOUS les évènements (via posthog.register) :
//   - distinct_id     : géré automatiquement par PostHog (identify ci-dessous).
//   - quiz_attempt_id : tentative de quiz courante (store, regénérée à chaque tentative).
//   - quiz_session_id : userScoringId créé à la complétion du quiz (null tant qu'absent).
// On synchronise ces propriétés depuis le store quiz et on les ré-enregistre à chaque changement
// (nouvelle tentative → nouveau quiz_attempt_id et quiz_session_id remis à null).
function syncIdentitySuperProperties(state: { quizAttemptId: string; userScoringId?: string }): void {
  getProvider()?.register?.({
    quiz_attempt_id: state.quizAttemptId,
    quiz_session_id: state.userScoringId ?? null,
  });
}

// Initialise le tracking côté client : identifie l'utilisateur par le `distinctId` persistant du
// quiz (réconciliation des sessions dans PostHog, consentement assumé pour l'instant) et enregistre
// les super properties d'identité, maintenues à jour via un abonnement au store.
// TODO(cookie-banner) : sans consentement, ne pas appeler `identify` (rester anonyme/cookieless).
export function initTracking(): void {
  if (!getProvider()) return;
  identify(useQuizStore.getState().distinctId);
  syncIdentitySuperProperties(useQuizStore.getState());

  let lastAttemptId = useQuizStore.getState().quizAttemptId;
  let lastSessionId = useQuizStore.getState().userScoringId;
  useQuizStore.subscribe((state) => {
    if (state.quizAttemptId === lastAttemptId && state.userScoringId === lastSessionId) return;
    lastAttemptId = state.quizAttemptId;
    lastSessionId = state.userScoringId;
    syncIdentitySuperProperties(state);
  });
}

// Force l'enregistrement du quiz_session_id (ex. accès direct à /results/:id où l'id vient de l'URL
// et non du store). No-op pendant le SSR.
export function setQuizSessionId(userScoringId: string): void {
  getProvider()?.register?.({ quiz_session_id: userScoringId });
}

// Retire les clés à valeur `undefined` : permet aux events de passer une propriété optionnelle
// systématiquement (ex. `rank: x ?? undefined`) sans envoyer de clé vide au provider.
function omitUndefined(properties: TrackingProperties): TrackingProperties {
  const result: TrackingProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

// Enregistre un évènement avec ses propriétés. No-op pendant le SSR.
export function track(event: string, properties?: TrackingProperties): void {
  getProvider()?.track(event, properties ? omitUndefined(properties) : properties);
}

// Associe l'utilisateur courant à un identifiant (ex. `distinctId` du quiz). No-op pendant le SSR.
export function identify(distinctId: string, traits?: TrackingTraits): void {
  getProvider()?.identify?.(distinctId, traits);
}
