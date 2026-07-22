import { POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export const COOKIE_CONSENT_MODAL_ID = "fr-consent-modal";

const COOKIE_CONSENT_NAME = "plateform_consent";
const COOKIE_CONSENT_OPEN_EVENT = "cookie-consent:open";
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

export function getCookieConsentStatus(cookieHeader: string = typeof document === "undefined" ? "" : document.cookie): TrackingConsentStatus {
  return parseCookieConsent(readCookieValue(cookieHeader, COOKIE_CONSENT_NAME));
}

function cookieAttributes(maxAge: number): string {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function writeCookieConsent(status: ConsentChoice): void {
  document.cookie = `${COOKIE_CONSENT_NAME}=${status}; ${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}

// Synchronise le choix avant l'hydratation afin que les premiers évènements de route utilisent
// immédiatement le bon mode PostHog.
export function prepareCookieConsent(): void {
  if (prepared || !isCookieConsentEnabled() || typeof window === "undefined") return;
  prepared = true;

  const status = getCookieConsentStatus();
  setTrackingConsentStatus(status);
  initTracking();
}

export function saveCookieConsent(status: ConsentChoice): void {
  if (!isCookieConsentEnabled() || typeof window === "undefined") return;

  writeCookieConsent(status);
  setTrackingConsentStatus(status);
  initTracking();
}

export function openCookieConsentPanel(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}

export function subscribeCookieConsentPanelOpen(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
  return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
}
