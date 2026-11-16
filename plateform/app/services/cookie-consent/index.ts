import { applyGtmConsentPreferences } from "~/services/tracking/providers/gtm";
import { COOKIE_CONSENT_OPEN_EVENT, getConsentServices, type ConsentPreferences, type ConsentService } from "./config";
import { isConsentChoice, parseCookieConsent as parseStoredConsent, readCookieConsent, writeCookieConsent } from "./storage";

export { COOKIE_CONSENT_MODAL_ID, consentServices, getConsentServices, type ConsentChoice, type ConsentPreferences, type ConsentService, type ConsentStatus } from "./config";

let prepared = false;

export function isCookieConsentEnabled(): boolean {
  return getConsentServices().length > 0;
}

export function parseCookieConsent(value: string | null, services: ConsentService[] = getConsentServices()): ConsentPreferences {
  return parseStoredConsent(value, services);
}

export function getCookieConsentPreferences(cookieHeader: string = typeof document === "undefined" ? "" : document.cookie): ConsentPreferences {
  return readCookieConsent(cookieHeader, getConsentServices());
}

function applyConsentPreferences(preferences: ConsentPreferences, services: ConsentService[]): void {
  const enabledPreferences = Object.fromEntries(services.map((service) => [service.id, preferences[service.id] ?? "pending"]));
  const gtmPreferences = Object.fromEntries(services.filter((service) => service.managedByGtm).map((service) => [service.id, enabledPreferences[service.id]]));
  let reloadRequired = applyGtmConsentPreferences(gtmPreferences);
  for (const service of services) {
    if (service.applyConsent?.(enabledPreferences[service.id]) === true) reloadRequired = true;
  }
  if (reloadRequired) window.location.reload();
}

// Synchronise les choix avant l'hydratation et les premiers effets applicatifs.
export function prepareCookieConsent(): void {
  if (prepared || !isCookieConsentEnabled() || typeof window === "undefined") return;
  prepared = true;

  const services = getConsentServices();
  applyConsentPreferences(getCookieConsentPreferences(), services);
}

export function saveCookieConsent(preferences: ConsentPreferences): void {
  if (!isCookieConsentEnabled() || typeof window === "undefined") return;

  const services = getConsentServices();
  if (services.some((service) => !isConsentChoice(preferences[service.id]))) return;

  writeCookieConsent(preferences, services);
  applyConsentPreferences(preferences, services);
}

export function openCookieConsentPanel(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}

export function subscribeCookieConsentPanelOpen(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
  return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
}
