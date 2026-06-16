import type { TrackingProvider, TrackingProviderName } from "../types";
import { createLocalProvider } from "./local";

// Fabrique le provider correspondant au nom demandé. Les outils non encore implémentés
// (posthog, umami, plausible, matomo) retombent sur le provider local : on garde ainsi un
// comportement défini sans rien envoyer à un service externe tant que le choix n'est pas tranché.
export function createProvider(name: TrackingProviderName): TrackingProvider {
  switch (name) {
    case "local":
      return createLocalProvider();
    case "posthog":
    case "umami":
    case "plausible":
    case "matomo":
      console.warn(`[tracking] provider "${name}" non implémenté, repli sur "local"`);
      return createLocalProvider();
    default:
      return createLocalProvider();
  }
}
