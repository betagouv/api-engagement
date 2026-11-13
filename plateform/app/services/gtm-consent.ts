import { GTM_CONTAINER_ID } from "~/services/config";
import type { TrackingConsentStatus } from "~/services/tracking/types";

export const GTM_CONSENT_SERVICE_IDS = ["google", "adform", "tiktok", "snapchat"] as const;

type GtmConsentServiceId = (typeof GTM_CONSENT_SERVICE_IDS)[number];
type GtmConsentState = Record<GtmConsentServiceId, "granted" | "denied">;

let appliedConsent: GtmConsentState | undefined;
let trackingEnabled = false;
let reloadRequired = false;

// Le dataLayer peut exister avec quatre refus : sa présence ne vaut donc jamais accord.
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

// Applique les quatre accords en une seule fois, avant tout évènement métier.
// Retourne true si un retrait nécessite de recharger le document, même si une autre régie reste acceptée.
export function applyGtmConsentPreferences(preferences: Partial<Record<GtmConsentServiceId, TrackingConsentStatus>>): boolean {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID) return false;
  if (!appliedConsent && !GTM_CONSENT_SERVICE_IDS.some((id) => preferences[id] === "granted" || preferences[id] === "denied")) return false;

  const nextConsent = Object.fromEntries(GTM_CONSENT_SERVICE_IDS.map((id) => [id, preferences[id] === "granted" ? "granted" : "denied"])) as GtmConsentState;
  if (appliedConsent && GTM_CONSENT_SERVICE_IDS.every((id) => appliedConsent?.[id] === nextConsent[id])) return reloadRequired;

  if (trackingEnabled && GTM_CONSENT_SERVICE_IDS.some((id) => appliedConsent?.[id] === "granted" && nextConsent[id] === "denied")) reloadRequired = true;
  appliedConsent = nextConsent;
  // Un retrait coupe aussi les évènements métier pendant que la navigation de rechargement démarre.
  trackingEnabled = !reloadRequired && GTM_CONSENT_SERVICE_IDS.some((id) => nextConsent[id] === "granted");

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "consent.updated",
    consent_google: nextConsent.google,
    consent_adform: nextConsent.adform,
    consent_tiktok: nextConsent.tiktok,
    consent_snapchat: nextConsent.snapchat,
  });

  if (trackingEnabled) loadGtm();
  return reloadRequired;
}
