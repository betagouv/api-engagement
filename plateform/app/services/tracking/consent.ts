import type { TrackingConsentStatus, TrackingProperties } from "./types";

export const IDENTITY_TRACKING_PROPERTIES = ["distinct_id", "quiz_attempt_id", "quiz_session_id"] as const;

// Défense en profondeur : même si un appelant ajoute une propriété d'identité directement à un
// évènement, elle ne doit jamais sortir de l'application sans consentement explicite.
export function sanitizePropertiesForConsent(properties: TrackingProperties, status: TrackingConsentStatus): TrackingProperties {
  if (status === "granted") return properties;

  const sanitized = { ...properties };
  for (const property of IDENTITY_TRACKING_PROPERTIES) delete sanitized[property];
  return sanitized;
}
