// Variables accessibles côté client (préfixe VITE_ obligatoire)
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3002";
export const ENV = (import.meta.env.VITE_ENV as string) || "development";
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;
export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;

// ID du publisher diffuseur, utilisé pour configurer le tag de tracking API Engagement (jstag.js).
export const PUBLISHER_ID = import.meta.env.VITE_PUBLISHER_ID as string | undefined;

// Correspond à PUBLISHER_IDS.API_ENGAGEMENT dans api/src/config.ts
export const PUBLISHER_ID_API_ENGAGEMENT = "63da29db7d356a87a4e35d4a";

// Durée totale (ms) d'une transition entre étapes du quiz : enter → hold → fade-out → onComplete.
// Le fade lui-même dure 700ms (classe Tailwind `duration-700` côté composants).
export const QUIZ_TRANSITION_MS = 3000;
