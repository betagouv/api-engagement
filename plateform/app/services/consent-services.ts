import { CRISP_WEBSITE_ID, POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export type ConsentStatus = TrackingConsentStatus;

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

// Injecte le widget Crisp. Idempotent, et sans effet côté serveur.
function loadCrisp(): void {
  if (typeof window === "undefined" || !CRISP_WEBSITE_ID || document.getElementById("crisp-client")) return;
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  const script = document.createElement("script");
  script.id = "crisp-client";
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  document.head.appendChild(script);
}

export interface ConsentService {
  /** Identifiant stable utilisé dans le cookie de consentement et les champs du formulaire. */
  id: string;
  /** À incrémenter lorsque la finalité ou les outils associés changent afin de redemander le consentement. */
  version: number;
  title: string;
  description: string;
  isEnabled(): boolean;
  applyConsent(status: ConsentStatus): void;
}

// Pour ajouter un outil soumis au consentement, ajouter une entrée à ce registre. Le stockage,
// le formulaire DSFR et les actions « tout accepter/refuser » sont générés automatiquement.
const consentServices: ConsentService[] = [
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
    applyConsent(status) {
      if (status === "granted") loadCrisp();
    },
  },
];

export function getConsentServices(): ConsentService[] {
  return consentServices.filter((service) => service.isEnabled());
}
