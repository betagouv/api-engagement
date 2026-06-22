import type { TrackingProvider, TrackingProviderName } from "../types";
import { createLocalProvider } from "./local";
import { createPosthogProvider } from "./posthog";

// Fabrique le provider correspondant au nom demandé. `local` reste le repli par défaut
// (console.log, aucun envoi externe) ; `posthog` est le provider de production.
export function createProvider(name: TrackingProviderName): TrackingProvider {
  switch (name) {
    case "posthog":
      return createPosthogProvider();
    case "local":
    default:
      return createLocalProvider();
  }
}
