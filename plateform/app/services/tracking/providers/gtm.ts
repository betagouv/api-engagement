import { GTM_CONTAINER_ID } from "~/services/config";
import type { TrackingConsentStatus, TrackingProperties, TrackingProvider } from "../types";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

type GtmConsentState = Record<string, "granted" | "denied">;

let appliedConsent: GtmConsentState | undefined;
let trackingEnabled = false;
let reloadRequired = false;

// Le dataLayer peut ne contenir que des refus : sa présence ne vaut donc jamais accord.
export function isGtmTrackingEnabled(): boolean {
  return typeof window !== "undefined" && trackingEnabled;
}

// Extrait <head> officiel, sans <noscript> qui contournerait le consentement JavaScript.
function loadGtm(): void {
  if (document.getElementById("gtm-client")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm-client";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

// Applique les accords GTM en une seule fois, avant tout évènement métier.
// Retourne true si un retrait nécessite de recharger le document, même si une autre régie reste acceptée.
export function applyGtmConsentPreferences(preferences: Partial<Record<string, TrackingConsentStatus>>): boolean {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID) return false;
  const serviceIds = Object.keys(preferences);
  if (!appliedConsent && !serviceIds.some((id) => preferences[id] === "granted" || preferences[id] === "denied")) return false;

  const nextConsent = Object.fromEntries(serviceIds.map((id) => [id, preferences[id] === "granted" ? "granted" : "denied"])) as GtmConsentState;
  if (appliedConsent && Object.keys(appliedConsent).length === serviceIds.length && serviceIds.every((id) => appliedConsent?.[id] === nextConsent[id])) return reloadRequired;

  if (trackingEnabled && Object.keys(appliedConsent ?? {}).some((id) => appliedConsent?.[id] === "granted" && nextConsent[id] !== "granted")) reloadRequired = true;
  appliedConsent = nextConsent;
  // Un retrait coupe aussi les évènements métier pendant que la navigation de rechargement démarre.
  trackingEnabled = !reloadRequired && serviceIds.some((id) => nextConsent[id] === "granted");

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "consent.updated",
    ...Object.fromEntries(serviceIds.map((id) => [`consent_${id}`, nextConsent[id]])),
  });

  if (trackingEnabled) loadGtm();
  return reloadRequired;
}

// Les choix sont fournis par cookie-consent ; le provider ne dépend pas du registre.
export function createGtmProvider(): TrackingProvider {
  return {
    name: "gtm",

    track(event: string, properties?: TrackingProperties) {
      if (!isGtmTrackingEnabled()) return;
      window.dataLayer?.push({ event, ...properties });
    },
  };
}
