// Variables accessibles côté client (préfixe VITE_ obligatoire)
export const API_URL = (import.meta.env.API_URL as string) || "http://localhost:4000";
export const ENV = (import.meta.env.VITE_ENV as string) || "development";
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;
