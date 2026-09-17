import { CRISP_WEBSITE_ID, GTM_CONTAINER_ID, POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export type ConsentStatus = TrackingConsentStatus;

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
    dataLayer?: unknown[];
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

// Charge Google Tag Manager (extrait <head> officiel). Idempotent, sans effet côté serveur.
// Le <noscript> officiel n'est pas injecté : il se déclencherait hors consentement (le flux de
// consentement est en JS), ce qui contredirait la finalité gclid/conversions.
function loadGtm(): void {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID || document.getElementById("gtm-client")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm-client";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
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
      if (status === "granted") return loadCrisp();
      // Retrait du consentement : rechargement contrôlé si le widget est déjà chargé (prepareCookieConsent ne le relancera pas tant que le refus est stocké).
      if (typeof document !== "undefined" && document.getElementById("crisp-client")) window.location.reload();
    },
  },
  {
    id: "gtm",
    version: 1,
    title: "Mesure des conversions publicitaires",
    description:
      "Google Tag Manager mesure les conversions issues de nos campagnes publicitaires et conserve l'identifiant de clic publicitaire (gclid) afin d'en optimiser la diffusion. Sans accord, aucun tag Google n'est chargé.",
    isEnabled: () => Boolean(GTM_CONTAINER_ID),
    applyConsent(status) {
      if (status === "granted") loadGtm();
    },
  },
];

export function getConsentServices(): ConsentService[] {
  return consentServices.filter((service) => service.isEnabled());
}
