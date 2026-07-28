import { POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

export type ConsentStatus = TrackingConsentStatus;

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
];

export function getConsentServices(): ConsentService[] {
  return consentServices.filter((service) => service.isEnabled());
}
