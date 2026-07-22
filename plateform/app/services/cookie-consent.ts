import { getConsentServices, type ConsentService, type ConsentStatus } from "~/services/consent-services";

export const COOKIE_CONSENT_MODAL_ID = "fr-consent-modal";

const COOKIE_CONSENT_NAME = "plateform_consent";
const COOKIE_CONSENT_OPEN_EVENT = "cookie-consent:open";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type ConsentChoice = Exclude<ConsentStatus, "pending">;
export type ConsentPreferences = Record<string, ConsentStatus>;

type StoredConsentPreferences = Record<string, { status: ConsentChoice; version: number }>;

let prepared = false;

export function isCookieConsentEnabled(): boolean {
  return getConsentServices().length > 0;
}

function readCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return null;
  const value = cookie.slice(prefix.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

export function parseCookieConsent(value: string | null, services: ConsentService[] = getConsentServices()): ConsentPreferences {
  let stored: StoredConsentPreferences = {};
  try {
    const parsed: unknown = value ? JSON.parse(value) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed as StoredConsentPreferences;
  } catch {
    // Un cookie absent ou invalide remet chaque service dans l'état pending.
  }

  return Object.fromEntries(
    services.map((service) => {
      const preference = stored[service.id];
      const status = preference?.version === service.version && isConsentChoice(preference.status) ? preference.status : "pending";
      return [service.id, status];
    }),
  );
}

export function getCookieConsentPreferences(cookieHeader: string = typeof document === "undefined" ? "" : document.cookie): ConsentPreferences {
  return parseCookieConsent(readCookieValue(cookieHeader, COOKIE_CONSENT_NAME));
}

function cookieAttributes(maxAge: number): string {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function writeCookieConsent(preferences: ConsentPreferences, services: ConsentService[]): void {
  const stored = Object.fromEntries(
    services.map((service) => [service.id, { status: preferences[service.id] as ConsentChoice, version: service.version }]),
  ) satisfies StoredConsentPreferences;
  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(stored))}; ${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}

function applyConsentPreferences(preferences: ConsentPreferences, services: ConsentService[]): void {
  for (const service of services) service.applyConsent(preferences[service.id] ?? "pending");
}

// Synchronise les choix avant l'hydratation afin que chaque outil démarre immédiatement dans le
// bon mode, avant les premiers effets applicatifs.
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
