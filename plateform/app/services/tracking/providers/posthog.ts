import posthog from "posthog-js";

import { POSTHOG_HOST, POSTHOG_KEY } from "~/services/config";

import type { TrackingProvider, TrackingProperties, TrackingTraits } from "../types";

// Provider PostHog. `init()` n'est appelé que côté navigateur (cf. garde `typeof window` dans
// `../index`), donc le SDK n'est initialisé que dans le browser. Sans clé `VITE_POSTHOG_KEY`,
// le provider reste inerte plutôt que d'échouer.
export function createPosthogProvider(): TrackingProvider {
  let ready = false;

  return {
    name: "posthog",

    init() {
      if (ready) return;
      if (!POSTHOG_KEY) {
        console.warn("[tracking] VITE_POSTHOG_KEY manquant : provider PostHog inactif");
        return;
      }
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // Consentement assumé pour l'instant : persistance localStorage + cookie, ce qui permet
        // de réconcilier les sessions d'un même navigateur via le distinctId.
        // TODO(cookie-banner) : sans consentement, passer en `persistence: "memory"` (cookieless,
        // pas de réconciliation multi-sessions) et ne pas identifier par distinctId.
        persistence: "localStorage+cookie",
        // SPA React Router : on ne s'appuie pas sur la détection auto de pageview.
        capture_pageview: false,
        // Ne crée un profil personne que pour les utilisateurs identifiés (limite la collecte).
        person_profiles: "identified_only",
      });
      ready = true;
    },

    track(event: string, properties?: TrackingProperties) {
      if (!ready) return;
      posthog.capture(event, properties);
    },

    identify(distinctId: string, traits?: TrackingTraits) {
      if (!ready) return;
      posthog.identify(distinctId, traits);
    },

    register(properties: TrackingProperties) {
      if (!ready) return;
      posthog.register(properties);
    },
  };
}
