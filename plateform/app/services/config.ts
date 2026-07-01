// Variables accessibles côté client (préfixe VITE_ obligatoire)
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3002";
export const ENV = (import.meta.env.VITE_ENV as string) || "development";
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;
export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;

// ID du publisher diffuseur, utilisé pour configurer le tag de tracking API Engagement (jstag.js).
export const PUBLISHER_ID = import.meta.env.VITE_PUBLISHER_ID as string | undefined;

// Outil de tracking front : "posthog" en production, "local" (console.log) par défaut en dev.
export const TRACKING_PROVIDER = (import.meta.env.VITE_TRACKING_PROVIDER as string | undefined) ?? "local";
// Clé projet PostHog (publique, côté client) et host d'ingestion. Sans clé, le provider PostHog
// reste inactif. Host EU par défaut (hébergement européen / RGPD).
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
export const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

// Correspond à PUBLISHER_IDS.API_ENGAGEMENT dans api/src/config.ts
export const PUBLISHER_ID_API_ENGAGEMENT = "63da29db7d356a87a4e35d4a";

// Durée totale (ms) d'une transition entre étapes du quiz : enter → hold → fade-out → onComplete.
// Le fade lui-même dure 700ms (classe Tailwind `duration-700` côté composants).
export const QUIZ_TRANSITION_MS = 3000;
