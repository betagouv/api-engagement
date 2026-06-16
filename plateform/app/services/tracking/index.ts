import { TRACKING_PROVIDER } from "~/services/config";

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

// Initialise le tracking (chargement éventuel du SDK). Optionnel : `track`/`identify`
// initialisent le provider à la demande. À appeler une fois côté client si on veut
// déclencher l'init au plus tôt (ex. dans un effet de `root.tsx`).
export function initTracking(): void {
  getProvider();
}

// Enregistre un évènement avec ses propriétés. No-op pendant le SSR.
export function track(event: string, properties?: TrackingProperties): void {
  getProvider()?.track(event, properties);
}

// Associe l'utilisateur courant à un identifiant (ex. `distinctId` du quiz). No-op pendant le SSR.
export function identify(distinctId: string, traits?: TrackingTraits): void {
  getProvider()?.identify?.(distinctId, traits);
}
