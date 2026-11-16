import { CRISP_WEBSITE_ID, GTM_CONTAINER_ID, POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { applyCrispConsent } from "~/services/crisp";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export type ConsentStatus = TrackingConsentStatus;

export interface ConsentService {
  /** Identifiant stable utilisé dans le cookie et les champs du formulaire. */
  id: string;
  /** Synchronise ce service dans le signal consent.updated de GTM. */
  managedByGtm?: boolean;
  /** À incrémenter lorsque la finalité change afin de redemander le consentement. */
  version: number;
  title: string;
  description: string;
  isEnabled(): boolean;
  /** Retourne true si le retrait exige un rechargement après synchronisation de tous les services. */
  applyConsent?(status: ConsentStatus): boolean | void;
}

function createGtmConsentService(id: string, title: string, description: string): ConsentService {
  return {
    id,
    title,
    version: 1,
    managedByGtm: true,
    description,
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
  };
}

// Source unique des services : stockage, formulaire et actions « tout accepter/refuser ».
export const consentServices: ConsentService[] = [
  {
    id: "posthog",
    version: 1,
    title: "Mesure d'audience",
    description:
      "PostHog mesure l'utilisation de la plateforme afin d'améliorer le parcours et les missions proposées. Sans accord, cette mesure reste cookieless et ne permet pas de reconnaître votre navigateur entre plusieurs journées.",
    isEnabled: () => TRACKING_PROVIDER === "posthog" && Boolean(POSTHOG_KEY),
    applyConsent(status) {
      setTrackingConsentStatus(status);
      initTracking();
    },
  },
  {
    id: "crisp",
    version: 1,
    title: "Chat d'assistance",
    description:
      "Crisp affiche une messagerie d'assistance et conserve votre conversation entre deux pages via un identifiant stocké dans votre navigateur. Sans accord, le chat n'est pas chargé.",
    isEnabled: () => Boolean(CRISP_WEBSITE_ID),
    applyConsent: applyCrispConsent,
  },
  // Les choix GTM sont synchronisés ensemble. L'ancien accord « gtm » n'est pas repris.
  createGtmConsentService(
    "google",
    "Google Campaign Manager",
    "Permet de mesurer les visites et les actions réalisées sur la plateforme après avoir vu ou cliqué sur une publicité diffusée via Google Campaign Manager. Sans votre accord, les balises de mesure de cette régie ne sont pas chargées.",
  ),
  createGtmConsentService(
    "adform",
    "Adform",
    "Permet de mesurer les visites et les actions réalisées sur la plateforme après une publicité diffusée via Adform, une plateforme de diffusion publicitaire. Sans votre accord, les balises Adform ne sont pas chargées.",
  ),
  createGtmConsentService(
    "tiktok",
    "TikTok",
    "Permet de mesurer les visites et les actions réalisées sur la plateforme après avoir vu ou cliqué sur l'une de nos publicités sur TikTok. Sans votre accord, le pixel TikTok n'est pas chargé.",
  ),
  createGtmConsentService(
    "snapchat",
    "Snapchat",
    "Permet de mesurer les visites et les actions réalisées sur la plateforme après avoir vu ou cliqué sur l'une de nos publicités sur Snapchat. Sans votre accord, le pixel Snapchat n'est pas chargé.",
  ),
];

export function getConsentServices(): ConsentService[] {
  return consentServices.filter((service) => service.isEnabled());
}

export const COOKIE_CONSENT_MODAL_ID = "fr-consent-modal";

export const COOKIE_CONSENT_NAME = "plateform_consent";
export const COOKIE_CONSENT_OPEN_EVENT = "cookie-consent:open";
export const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type ConsentChoice = Exclude<ConsentStatus, "pending">;
export type ConsentPreferences = Record<string, ConsentStatus>;
