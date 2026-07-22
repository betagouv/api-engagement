import { POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export const COOKIE_CONSENT_MODAL_ID = "fr-consent-modal";

const COOKIE_CONSENT_NAME = "plateform_consent";
const LEGACY_TARTEAUCITRON_COOKIE_NAME = "tarteaucitron";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

type ConsentChoice = Exclude<TrackingConsentStatus, "pending">;

let prepared = false;

export function isCookieConsentEnabled(): boolean {
  return TRACKING_PROVIDER === "posthog" && Boolean(POSTHOG_KEY);
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

export function parseCookieConsent(value: string | null): TrackingConsentStatus {
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";
  return "pending";
}

export function parseLegacyTarteaucitronConsent(value: string | null): TrackingConsentStatus {
  const match = value?.match(/(?:^|!)posthog=(true|false|wait)(?:!|$)/);
  if (match?.[1] === "true") return "granted";
  if (match?.[1] === "false") return "denied";
  return "pending";
}

export function getCookieConsentStatus(cookieHeader: string = typeof document === "undefined" ? "" : document.cookie): TrackingConsentStatus {
  const currentStatus = parseCookieConsent(readCookieValue(cookieHeader, COOKIE_CONSENT_NAME));
  if (currentStatus !== "pending") return currentStatus;

  return parseLegacyTarteaucitronConsent(readCookieValue(cookieHeader, LEGACY_TARTEAUCITRON_COOKIE_NAME));
}

function cookieAttributes(maxAge: number): string {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function writeCookieConsent(status: ConsentChoice): void {
  document.cookie = `${COOKIE_CONSENT_NAME}=${status}; ${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}

function removeLegacyTarteaucitronCookie(): void {
  document.cookie = `${LEGACY_TARTEAUCITRON_COOKIE_NAME}=; ${cookieAttributes(0)}`;
}

// Synchronise le choix avant l'hydratation afin que les premiers évènements de route utilisent
// immédiatement le bon mode PostHog. Les anciens choix Tarteaucitron sont migrés une seule fois.
export function prepareCookieConsent(): void {
  if (prepared || !isCookieConsentEnabled() || typeof window === "undefined") return;
  prepared = true;

  const legacyCookie = readCookieValue(document.cookie, LEGACY_TARTEAUCITRON_COOKIE_NAME);
  const status = getCookieConsentStatus();

  if (parseCookieConsent(readCookieValue(document.cookie, COOKIE_CONSENT_NAME)) === "pending" && status !== "pending") {
    writeCookieConsent(status);
  }
  if (legacyCookie !== null) removeLegacyTarteaucitronCookie();

  setTrackingConsentStatus(status);
  initTracking();
}

export function saveCookieConsent(status: ConsentChoice): void {
  if (!isCookieConsentEnabled() || typeof window === "undefined") return;

  writeCookieConsent(status);
  setTrackingConsentStatus(status);
  initTracking();
}
