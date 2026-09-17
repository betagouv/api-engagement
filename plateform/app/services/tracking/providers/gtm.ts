import type { TrackingProvider, TrackingProperties } from "../types";

// Provider Google Tag Manager : pousse chaque évènement dans `window.dataLayer`, où les tags
// configurés côté GTM (GA4, Ads, ...) se déclenchent. Volontairement minimal — GTM ne consomme que
// des évènements : pas d'identité ni de super properties (contrairement à PostHog).
//
// `window.dataLayer` n'existe qu'après le chargement du conteneur, déclenché uniquement sur
// consentement (cf. loadGtm dans services/consent-services). Tant qu'il est absent, on n'émet rien :
// aucun évènement GTM sans accord.
export function createGtmProvider(): TrackingProvider {
  return {
    name: "gtm",

    track(event: string, properties?: TrackingProperties) {
      window.dataLayer?.push({ event, ...properties });
    },
  };
}
