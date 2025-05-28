export const ENV = import.meta.env.VITE_ENV || "development";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const BENEVOLAT_URL = import.meta.env.VITE_BENEVOLAT_URL || "http://localhost:3001";
export const VOLONTARIAT_URL = import.meta.env.VITE_VOLONTARIAT_URL || "http://localhost:3001";
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";

console.log("ENV", ENV);
console.log("API_URL", API_URL);
console.log("BENEVOLAT_URL", BENEVOLAT_URL);
console.log("VOLONTARIAT_URL", VOLONTARIAT_URL);
console.log("SENTRY_DSN", SENTRY_DSN);
