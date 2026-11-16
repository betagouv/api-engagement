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
  {
    id: "google",
    managedByGtm: true,
    version: 1,
    title: "Google Campaign Manager",
    description:
      "Google Campaign Manager mesure les conversions et la performance de nos campagnes publicitaires à l'aide de traceurs. Sans accord, aucune balise de cette régie n'est activée.",
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
  },
  {
    id: "adform",
    managedByGtm: true,
    version: 1,
    title: "Adform",
    description: "Adform mesure les conversions et la performance de nos campagnes publicitaires à l'aide de traceurs. Sans accord, aucune balise de cette régie n'est activée.",
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
  },
  {
    id: "tiktok",
    managedByGtm: true,
    version: 1,
    title: "TikTok",
    description: "TikTok mesure les conversions et la performance de nos campagnes publicitaires à l'aide de traceurs. Sans accord, aucune balise de cette régie n'est activée.",
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
  },
  {
    id: "snapchat",
    managedByGtm: true,
    version: 1,
    title: "Snapchat",
    description: "Snapchat mesure les conversions et la performance de nos campagnes publicitaires à l'aide de traceurs. Sans accord, aucune balise de cette régie n'est activée.",
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
  },
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
