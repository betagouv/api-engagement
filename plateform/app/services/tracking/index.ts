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

// Initialise le tracking côté client et identifie l'utilisateur par le `distinctId` persistant
// du quiz, afin de réconcilier ses sessions dans PostHog (consentement assumé pour l'instant).
// TODO(cookie-banner) : sans consentement, ne pas appeler `identify` (rester anonyme/cookieless).
export function initTracking(): void {
  if (!getProvider()) return;
  identify(useQuizStore.getState().distinctId);
}

// Enregistre un évènement avec ses propriétés. No-op pendant le SSR.
export function track(event: string, properties?: TrackingProperties): void {
  getProvider()?.track(event, properties);
}

// Associe l'utilisateur courant à un identifiant (ex. `distinctId` du quiz). No-op pendant le SSR.
export function identify(distinctId: string, traits?: TrackingTraits): void {
  getProvider()?.identify?.(distinctId, traits);
}
