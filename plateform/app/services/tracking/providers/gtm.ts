import { isGtmTrackingEnabled } from "~/services/gtm-consent";
import type { TrackingProvider, TrackingProperties } from "../types";

// Provider Google Tag Manager : pousse chaque évènement dans `window.dataLayer`, où les tags
// configurés côté GTM (GA4, Ads, ...) se déclenchent. Volontairement minimal — GTM ne consomme que
// des évènements : pas d'identité ni de super properties (contrairement à PostHog).
//
// Le dataLayer peut ne contenir que des refus. Les évènements métier exigent au moins un accord
// publicitaire et restent bloqués lors d'un retrait en attente de rechargement. Chaque balise du
// conteneur doit en plus vérifier l'accord de sa propre régie et le nom d'hôte de production.
export function createGtmProvider(): TrackingProvider {
  return {
    name: "gtm",

    track(event: string, properties?: TrackingProperties) {
      if (!isGtmTrackingEnabled()) return;
      window.dataLayer?.push({ event, ...properties });
    },
  };
}
