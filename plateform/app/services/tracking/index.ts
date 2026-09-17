import { GTM_CONTAINER_ID, TRACKING_PROVIDER } from "~/services/config";
import { useQuizStore } from "~/stores/quiz";
import { CAMPAIGN_UTM_KEYS, getCampaignParamsFromSearch, resolveActiveCampaign, type CampaignParams } from "~/utils/campaign-attribution";
import { getInternalUserFlagAction, isInternalUserFlagEnabled, persistInternalUserFlagAction } from "~/utils/internal-user-flag";

import { createProvider } from "./providers";
import { createGtmProvider } from "./providers/gtm";
import { IDENTITY_TRACKING_PROPERTIES, sanitizePropertiesForConsent } from "./consent";
import type { TrackingConsentStatus, TrackingProperties, TrackingProvider, TrackingProviderName, TrackingTraits } from "./types";

export type { TrackingConsentStatus, TrackingProperties, TrackingProvider, TrackingProviderName, TrackingTraits } from "./types";

// Providers actifs, instanciés paresseusement à la première utilisation côté navigateur. Le provider
// d'analytics (posthog/local) est toujours présent ; GTM s'y ajoute quand un conteneur est configuré.
// Chaque appel public est diffusé à tous : PostHog porte identité/consentement/super properties, GTM
// ne consomme que les évènements (ses autres méthodes sont absentes, donc no-op à la diffusion).
let providers: TrackingProvider[] | null = null;
let consentStatus: TrackingConsentStatus = "pending";
let identitySubscriptionInitialized = false;
// Origine "landing" de la session courante, conservée pour être ré-enregistrée après une transition de
// consentement (qui réinitialise les super properties PostHog). Session-scoped : perdue au reload de la page.
let landingOrigin: string | null = null;

// Le tracking est exclusivement côté client : on ne veut rien émettre pendant le rendu SSR.
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getProviders(): TrackingProvider[] {
  if (!isBrowser()) return [];
  if (!providers) {
    providers = [createProvider(TRACKING_PROVIDER as TrackingProviderName)];
    if (GTM_CONTAINER_ID) providers.push(createGtmProvider());

    for (const p of providers) p.init?.();
    initializeIdentitySubscription();
    for (const p of providers) {
      applyConsentAndIdentity(p);
      syncContextSuperProperties(p);
    }
  }
  return providers;
}

// Super properties d'identité attachées à TOUS les évènements (via posthog.register) :
//   - distinct_id     : géré automatiquement par PostHog (identify ci-dessous).
//   - quiz_attempt_id : tentative de quiz courante (store, regénérée à chaque tentative).
//   - quiz_session_id : userScoringId créé à la complétion du quiz (null tant qu'absent).
// On synchronise ces propriétés depuis le store quiz et on les ré-enregistre à chaque changement
// (nouvelle tentative → nouveau quiz_attempt_id et quiz_session_id remis à null).
function syncIdentitySuperProperties(targetProvider: TrackingProvider, state: { quizAttemptId: string; userScoringId?: string }): void {
  targetProvider.register?.({
    quiz_attempt_id: state.quizAttemptId,
    quiz_session_id: state.userScoringId ?? null,
  });
}

function syncIdentity(targetProvider: TrackingProvider): void {
  const state = useQuizStore.getState();
  targetProvider.identify?.(state.distinctId);
  syncIdentitySuperProperties(targetProvider, state);
}

function clearIdentitySuperProperties(targetProvider: TrackingProvider): void {
  for (const property of IDENTITY_TRACKING_PROPERTIES) {
    if (property !== "distinct_id") targetProvider.unregister?.(property);
  }
}

function shouldSyncIdentity(targetProvider: TrackingProvider): boolean {
  return targetProvider.name !== "posthog" || consentStatus === "granted";
}

function applyConsentAndIdentity(targetProvider: TrackingProvider): void {
  if (targetProvider.name === "posthog") targetProvider.setConsentStatus?.(consentStatus);

  if (shouldSyncIdentity(targetProvider)) {
    syncIdentity(targetProvider);
  } else {
    clearIdentitySuperProperties(targetProvider);
  }
}

function syncContextSuperProperties(targetProvider: TrackingProvider): void {
  syncInternalUserFlag(targetProvider);
  syncCampaignSuperProperties(targetProvider);
  syncLandingOrigin(targetProvider);
}

// Ré-attache landing_origin après une resynchro (transition de consentement) : PostHog réinitialise ses
// super properties, et l'effet de la route est protégé contre une nouvelle exécution. En l'absence
// d'origine active, on unregister pour purger une valeur persistée par PostHog lors d'une session
// précédente (sinon elle continuerait de polluer tous les évènements) — même pattern que internal_user/UTM.
function syncLandingOrigin(provider: TrackingProvider): void {
  if (landingOrigin) provider.register?.({ landing_origin: landingOrigin });
  else provider.unregister?.("landing_origin");
}

// L'abonnement est installé une seule fois. Les changements du quiz ne sont synchronisés vers
// PostHog que lorsque l'utilisateur a explicitement accepté le tracking persistant.
function initializeIdentitySubscription(): void {
  if (identitySubscriptionInitialized) return;
  identitySubscriptionInitialized = true;

  let lastAttemptId = useQuizStore.getState().quizAttemptId;
  let lastSessionId = useQuizStore.getState().userScoringId;
  useQuizStore.subscribe((state) => {
    if (state.quizAttemptId === lastAttemptId && state.userScoringId === lastSessionId) return;
    lastAttemptId = state.quizAttemptId;
    lastSessionId = state.userScoringId;
    for (const p of getProviders()) if (shouldSyncIdentity(p)) syncIdentitySuperProperties(p, state);
  });
}

function syncInternalUserFlag(provider: TrackingProvider): void {
  const action = getInternalUserFlagAction(window.location.search);
  let enabled = action === "enable";
  try {
    persistInternalUserFlagAction(action, window.localStorage);
    enabled = isInternalUserFlagEnabled(window.location.search, window.localStorage);
  } catch {
    // Le marqueur UI ne doit pas empêcher la synchronisation PostHog.
  }

  if (enabled) {
    provider.register?.({ internal_user: true });
    return;
  }

  provider.unregister?.("internal_user");
}

// Super properties d'attribution de campagne (utm_source/campaign/medium) attachées à TOUS les
// évènements. Modèle "last non-direct touch" + session glissante de 30 min (cf. resolveActiveCampaign) :
// une nouvelle campagne écrase l'attribution, le direct/navigation interne la prolonge, l'inactivité
// la purge. On `unregister` les UTM absents de l'attribution active pour ne pas laisser d'anciennes
// valeurs persistées par PostHog au-delà du TTL.
function syncCampaignSuperProperties(provider: TrackingProvider): void {
  let campaign: CampaignParams = {};
  if (consentStatus !== "granted") {
    // Aucun accès au localStorage avant l'accord : les UTM de l'URL courante restent néanmoins
    // disponibles sur les évènements cookieless de la page d'atterrissage.
    campaign = getCampaignParamsFromSearch(window.location.search);
  } else {
    try {
      campaign = resolveActiveCampaign(window.location.search, window.localStorage);
    } catch {
      // localStorage indisponible : au minimum, attacher les UTM de l'URL courante.
      campaign = getCampaignParamsFromSearch(window.location.search);
    }
  }

  for (const key of CAMPAIGN_UTM_KEYS) {
    if (campaign[key] === undefined) provider.unregister?.(key);
  }

  if (Object.keys(campaign).length > 0) provider.register?.(campaign);
}

// Déclenche l'init paresseuse (providers + identité + flag interne) au plus tôt, sans attendre un premier track().
export function initTracking(): void {
  getProviders();
}

// Synchronise le choix affiché dans le gestionnaire DSFR avec PostHog. Pending et denied restent
// cookieless ; granted active la persistance et l'identification pour les évènements suivants.
export function setTrackingConsentStatus(status: TrackingConsentStatus): void {
  if (!isBrowser() || status === consentStatus) return;
  consentStatus = status;

  if (providers) {
    for (const p of providers) {
      applyConsentAndIdentity(p);
      // PostHog réinitialise ses propriétés lors d'une transition cookieless ↔ persistante.
      syncContextSuperProperties(p);
    }
  } else {
    getProviders();
  }
}

export function getTrackingConsentStatus(): TrackingConsentStatus {
  return consentStatus;
}

// Force l'enregistrement du quiz_session_id (ex. accès direct à /results/:id où l'id vient de l'URL
// et non du store). No-op pendant le SSR.
export function setQuizSessionId(userScoringId: string): void {
  for (const p of getProviders()) if (shouldSyncIdentity(p)) p.register?.({ quiz_session_id: userScoringId });
}

// Enregistre l'origine "landing" comme super property attachée à tous les évènements suivants
// (page.viewed /missions, quiz.*, mission.clicked, results.viewed, email_missions.sent), sur le même
// mécanisme que les UTM et internal_user. Conservée en mémoire pour survivre à une transition de
// consentement (cf. syncLandingOrigin). No-op pendant le SSR.
export function registerLandingOrigin(origin: string): void {
  landingOrigin = origin;
  for (const p of getProviders()) p.register?.({ landing_origin: origin });
}

// Désactive le flag interne depuis l'UI de debug. No-op pendant le SSR.
export function disableInternalUserFlag(): void {
  const list = getProviders();
  if (!list.length) return;

  try {
    persistInternalUserFlagAction("disable", window.localStorage);
  } catch {
    // Le marqueur UI ne doit pas empêcher la synchronisation PostHog.
  }

  for (const p of list) p.unregister?.("internal_user");
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
  const list = getProviders();
  if (!list.length) return;

  const sanitized = properties ? sanitizePropertiesForConsent(omitUndefined(properties), consentStatus) : properties;
  for (const p of list) p.track(event, sanitized);
}

// Associe l'utilisateur courant à un identifiant (ex. `distinctId` du quiz). No-op pendant le SSR.
export function identify(distinctId: string, traits?: TrackingTraits): void {
  for (const p of getProviders()) if (shouldSyncIdentity(p)) p.identify?.(distinctId, traits);
}
