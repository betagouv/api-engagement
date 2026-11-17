import { COOKIE_CONSENT_NAME, COOKIE_MAX_AGE_SECONDS, type ConsentChoice, type ConsentPreferences, type ConsentService } from "./config";

type StoredConsentPreferences = Record<string, { status: ConsentChoice; version: number }>;

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

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

export function parseCookieConsent(value: string | null, services: ConsentService[]): ConsentPreferences {
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

export function readCookieConsent(cookieHeader: string, services: ConsentService[]): ConsentPreferences {
  return parseCookieConsent(readCookieValue(cookieHeader, COOKIE_CONSENT_NAME), services);
}

function cookieAttributes(maxAge: number): string {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function writeCookieConsent(preferences: ConsentPreferences, services: ConsentService[]): void {
  const stored = Object.fromEntries(
    services.map((service) => [service.id, { status: preferences[service.id] as ConsentChoice, version: service.version }]),
  ) satisfies StoredConsentPreferences;
  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(stored))}; ${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}
