import { POSTHOG_KEY, TRACKING_PROVIDER } from "~/services/config";
import { getTrackingConsentStatus, initTracking, setTrackingConsentStatus, type TrackingConsentStatus } from "~/services/tracking";

const TARTEAUCITRON_COOKIE_NAME = "tarteaucitron";
const POSTHOG_SERVICE_KEY = "posthog";

interface TarteaucitronService {
  key: string;
  type: "analytic";
  name: string;
  uri: string;
  needConsent: boolean;
  cookies: string[];
  js(): void;
  fallback(): void;
}

interface TarteaucitronApi {
  init(parameters: Record<string, unknown>): void;
  job?: string[];
  services: Record<string, TarteaucitronService>;
  state: Record<string, boolean | undefined>;
  userInterface: {
    closePanel(): void;
    openPanel(): void;
  };
}

declare global {
  interface Window {
    tarteaucitron?: TarteaucitronApi;
    tarteaucitronCustomText?: Record<string, unknown>;
  }
}

let prepared = false;
let initialized = false;

export function isCookieConsentEnabled(): boolean {
  return TRACKING_PROVIDER === "posthog" && Boolean(POSTHOG_KEY);
}

export function parseTarteaucitronConsent(cookieValue: string): TrackingConsentStatus {
  const match = cookieValue.match(/(?:^|!)posthog=(true|false|wait)(?:!|$)/);
  if (match?.[1] === "true") return "granted";
  if (match?.[1] === "false") return "denied";
  return "pending";
}

function readTarteaucitronConsent(): TrackingConsentStatus {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TARTEAUCITRON_COOKIE_NAME}=`));

  if (!cookie) return "pending";
  return parseTarteaucitronConsent(cookie.slice(TARTEAUCITRON_COOKIE_NAME.length + 1));
}

function statusFromTarteaucitronState(tarteaucitron: TarteaucitronApi): TrackingConsentStatus {
  const state = tarteaucitron.state[POSTHOG_SERVICE_KEY];
  return state === true ? "granted" : state === false ? "denied" : "pending";
}

function synchronizeConsent(status: TrackingConsentStatus): void {
  if (getTrackingConsentStatus() !== status) setTrackingConsentStatus(status);
  initTracking();
}

function closePanelWhenConsentIsComplete(tarteaucitron: TarteaucitronApi): void {
  const panel = document.getElementById("tarteaucitron");
  const serviceKeys = tarteaucitron.job ?? [];
  if (!panel || window.getComputedStyle(panel).display === "none") return;
  if (!serviceKeys.length || serviceKeys.some((key) => typeof tarteaucitron.state[key] !== "boolean")) return;

  tarteaucitron.userInterface.closePanel();
}

function handleConsentActionClick(event: MouseEvent, tarteaucitron: TarteaucitronApi): void {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest("#tarteaucitron button:is(.tarteaucitronAllow, .tarteaucitronDeny)")) return;

  // Le gestionnaire natif est attaché au bouton et s'exécute avant celui-ci, placé sur document.
  // La microtâche couvre aussi le cas où l'utilisateur reclique sur un choix déjà actif : dans ce
  // cas Tarteaucitron ne réémet aucun évènement de consentement.
  queueMicrotask(() => closePanelWhenConsentIsComplete(tarteaucitron));
}

// Prépare la source de vérité et synchronise le choix mémorisé sans modifier le DOM. Cette
// étape peut donc être appelée avant l'hydratation React.
export function prepareCookieConsent(): void {
  if (prepared || !isCookieConsentEnabled() || typeof window === "undefined") return;
  prepared = true;

  const tarteaucitron = window.tarteaucitron;
  if (!tarteaucitron) {
    console.warn("[cookie-consent] Tarteaucitron indisponible : tracking maintenu en attente");
    initTracking();
    return;
  }

  // Appliquer le choix mémorisé avant l'hydratation React évite de perdre le premier évènement
  // d'une visite consentie et neutralise immédiatement un ancien état PostHog divergent.
  synchronizeConsent(readTarteaucitronConsent());

  document.addEventListener(`${POSTHOG_SERVICE_KEY}_allowed`, () => {
    synchronizeConsent("granted");
  });
  document.addEventListener(`${POSTHOG_SERVICE_KEY}_disallowed`, () => {
    synchronizeConsent("denied");
  });
  document.addEventListener(`${POSTHOG_SERVICE_KEY}_added`, () => synchronizeConsent(statusFromTarteaucitronState(tarteaucitron)));
  document.addEventListener("click", (event) => handleConsentActionClick(event, tarteaucitron));

  window.tarteaucitronCustomText = {
    alertBigPrivacy: "Ce site utilise PostHog pour mesurer son usage. Choisissez si vous acceptez le suivi persistant.",
    disclaimer:
      "Sans accord, la mesure d’audience reste anonyme et sans stockage dans votre navigateur. Avec votre accord, PostHog peut reconnaître votre parcours entre plusieurs visites.",
    "desc-posthog": "Mesure l’utilisation de la plateforme afin d’améliorer le parcours et les missions proposées.",
  };

  tarteaucitron.services[POSTHOG_SERVICE_KEY] = {
    key: POSTHOG_SERVICE_KEY,
    type: "analytic",
    name: "PostHog",
    uri: "https://posthog.com/privacy",
    needConsent: true,
    cookies: POSTHOG_KEY ? [`ph_${POSTHOG_KEY}_posthog`] : [],
    // PostHog est déjà chargé depuis le bundle npm. Les changements sont traités par les
    // évènements Tarteaucitron afin de couvrir aussi les refus et retraits de consentement.
    js() {},
    fallback() {},
  };

  tarteaucitron.job = tarteaucitron.job ?? [];
  if (!tarteaucitron.job.includes(POSTHOG_SERVICE_KEY)) tarteaucitron.job.push(POSTHOG_SERVICE_KEY);
}

// Tarteaucitron ajoute son propre nœud à <body>. L'initialisation doit donc avoir lieu après
// l'hydratation pour ne pas modifier le HTML SSR que React est en train de réconcilier.
export function initCookieConsent(): void {
  if (initialized || !isCookieConsentEnabled() || typeof window === "undefined") return;
  if (!prepared) prepareCookieConsent();

  const tarteaucitron = window.tarteaucitron;
  if (!tarteaucitron) return;
  initialized = true;

  tarteaucitron.init({
    privacyUrl: "/politique-de-confidentialite",
    bodyPosition: "top",
    hashtag: "#tarteaucitron",
    cookieName: TARTEAUCITRON_COOKIE_NAME,
    orientation: "bottom",
    groupServices: false,
    showDetailsOnClick: true,
    serviceDefaultState: "wait",
    showAlertSmall: false,
    cookieslist: false,
    cookieslistEmbed: false,
    showIcon: false,
    adblocker: false,
    DenyAllCta: true,
    AcceptAllCta: true,
    highPrivacy: true,
    alwaysNeedConsent: false,
    handleBrowserDNTRequest: false,
    removeCredit: true,
    moreInfoLink: true,
    useExternalCss: true,
    useExternalJs: true,
    readmoreLink: "/politique-de-confidentialite",
    mandatory: true,
    mandatoryCta: true,
    googleConsentMode: false,
    bingConsentMode: false,
    pianoConsentMode: false,
    softConsentMode: false,
    dataLayer: false,
    serverSide: false,
    partnersList: false,
  });
}

export function openCookieConsentPanel(): void {
  if (typeof window === "undefined" || !isCookieConsentEnabled()) return;
  if (!initialized) initCookieConsent();
  window.tarteaucitron?.userInterface.openPanel();
}
