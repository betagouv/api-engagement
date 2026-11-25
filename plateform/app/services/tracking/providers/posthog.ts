import type { PostHog } from "posthog-js";

import { POSTHOG_HOST, POSTHOG_KEY } from "~/services/config";

import type { TrackingConsentStatus, TrackingProperties, TrackingProvider, TrackingTraits } from "../types";

// Provider PostHog. `init()` n'est appelé que côté navigateur (cf. garde `typeof window` dans
// `../index`), donc le SDK n'est initialisé que dans le browser. Sans clé `VITE_POSTHOG_KEY`,
// le provider reste inerte plutôt que d'échouer.
export function createPosthogProvider(): TrackingProvider {
  let ready = false;
  let consentStatus: TrackingConsentStatus | null = null;
  let client: PostHog | null = null;
  // Le SDK (~100 Ko) est chargé à la demande pour ne pas concurrencer le CSS au chargement de la page (LCP mobile) :
  // les appels faits pendant son téléchargement sont mis en file puis rejoués dans l'ordre.
  const pendingCalls: Array<(posthog: PostHog) => void> = [];
  const run = (call: (posthog: PostHog) => void) => {
    if (client) call(client);
    else pendingCalls.push(call);
  };

  return {
    name: "posthog",

    init() {
      if (ready) return;
      const posthogKey = POSTHOG_KEY;
      if (!posthogKey) {
        console.warn("[tracking] VITE_POSTHOG_KEY manquant : provider PostHog inactif");
        return;
      }
      ready = true;
      import("posthog-js")
        .then(({ default: posthog }) => {
          posthog.init(posthogKey, {
            api_host: POSTHOG_HOST,
            defaults: "2026-05-30",
            // Le statut PostHog reste en opt-out tant que le gestionnaire DSFR n'a pas reçu d'accord :
            // les évènements sont alors cookieless, puis deviennent persistants après acceptation.
            cookieless_mode: "on_reject",
            // Ne crée un profil personne que pour les utilisateurs identifiés (limite la collecte).
            person_profiles: "identified_only",
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            capture_performance: false, // web vitals
          });
          client = posthog;
          for (const call of pendingCalls) call(posthog);
          pendingCalls.length = 0;
        })
        // Le tracking ne doit jamais casser la page (bloqueur de pub, coupure réseau).
        .catch(() => {});
    },

    setConsentStatus(status: TrackingConsentStatus) {
      if (!ready || status === consentStatus) return;
      consentStatus = status;

      if (status === "granted") {
        // `false` évite d'ajouter un évènement technique `$opt_in` au plan de tracking métier.
        run((posthog) => posthog.opt_in_capturing({ captureEventName: false }));
        return;
      }

      // `on_reject` utilise l'opt-out pour activer le hash serveur cookieless. Cela couvre le
      // refus explicite comme l'état pending piloté par le gestionnaire de consentement.
      run((posthog) => posthog.opt_out_capturing());
    },

    track(event: string, properties?: TrackingProperties) {
      if (!ready || consentStatus === null) return;
      run((posthog) => posthog.capture(event, properties));
    },

    identify(distinctId: string, traits?: TrackingTraits) {
      if (!ready || consentStatus !== "granted") return;
      run((posthog) => posthog.identify(distinctId, traits));
    },

    register(properties: TrackingProperties) {
      if (!ready) return;
      run((posthog) => posthog.register(properties));
    },

    unregister(property: string) {
      if (!ready) return;
      run((posthog) => posthog.unregister(property));
    },
  };
}
