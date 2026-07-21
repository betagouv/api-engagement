import posthog from "posthog-js";

import { POSTHOG_HOST, POSTHOG_KEY } from "~/services/config";

import type { TrackingConsentStatus, TrackingProperties, TrackingProvider, TrackingTraits } from "../types";

// Provider PostHog. `init()` n'est appelé que côté navigateur (cf. garde `typeof window` dans
// `../index`), donc le SDK n'est initialisé que dans le browser. Sans clé `VITE_POSTHOG_KEY`,
// le provider reste inerte plutôt que d'échouer.
export function createPosthogProvider(): TrackingProvider {
  let ready = false;
  let consentStatus: TrackingConsentStatus | null = null;

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
        defaults: "2026-05-30",
        // Flux recommandé par PostHog avec un bandeau : aucune capture avant le choix,
        // cookieless après refus et persistance complète après acceptation.
        cookieless_mode: "on_reject",
        // Ne crée un profil personne que pour les utilisateurs identifiés (limite la collecte).
        person_profiles: "identified_only",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false, // web vitals
      });
      ready = true;
    },

    setConsentStatus(status: TrackingConsentStatus) {
      if (!ready || status === consentStatus) return;
      consentStatus = status;

      if (status === "granted") {
        // `false` évite d'ajouter un évènement technique `$opt_in` au plan de tracking métier.
        posthog.opt_in_capturing({ captureEventName: false });
        return;
      }

      if (status === "denied") {
        posthog.opt_out_capturing();
        return;
      }

      // Tarteaucitron est la source de vérité. Un état encore indéterminé doit donc aussi
      // neutraliser un ancien consentement PostHog éventuellement resté dans le navigateur.
      posthog.reset(true);
      posthog.clear_opt_in_out_capturing();
    },

    track(event: string, properties?: TrackingProperties) {
      if (!ready || consentStatus === null || consentStatus === "pending") return;
      posthog.capture(event, properties);
    },

    identify(distinctId: string, traits?: TrackingTraits) {
      if (!ready || consentStatus !== "granted") return;
      posthog.identify(distinctId, traits);
    },

    register(properties: TrackingProperties) {
      if (!ready) return;
      posthog.register(properties);
    },

    unregister(property: string) {
      if (!ready) return;
      posthog.unregister(property);
    },
  };
}
