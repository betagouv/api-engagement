export type RateLimitDetails = {
  provider?: string; // ex. "albert", "mistral.chat"
  statusCode?: number; // 429
  retryAfter?: string; // header retry-after si présent
  detail?: string; // message de limite extrait du corps (Albert renvoie `{"detail":"… tokens per day exceeded …"}`)
  rateLimitHeaders?: Record<string, string>; // sous-ensemble filtré des headers de rate-limit (highlights lisibles)
  responseHeaders?: Record<string, string>; // headers complets (pour découvrir le nommage exact côté provider)
  responseBody?: string; // corps tronqué (le provider y met souvent le message de limite)
};

/** Construit un message lisible résumant la limite atteinte. Sans détails → message historique. */
export const buildRateLimitMessage = (details?: RateLimitDetails): string => {
  if (!details) {
    return "Rate limit reached";
  }

  const parts: string[] = [];
  if (details.provider) {
    parts.push(`provider=${details.provider}`);
  }
  if (details.statusCode != null) {
    parts.push(`status=${details.statusCode}`);
  }
  if (details.retryAfter) {
    parts.push(`retry-after=${details.retryAfter}`);
  }
  if (details.detail) {
    parts.push(details.detail);
  }
  for (const [key, value] of Object.entries(details.rateLimitHeaders ?? {})) {
    if (key === "retry-after") {
      continue; // déjà affiché ci-dessus
    }
    parts.push(`${key}=${value}`);
  }

  return parts.length ? `Rate limit reached [${parts.join(", ")}]` : "Rate limit reached";
};

export class MissionEnrichmentRateLimitError extends Error {
  readonly details?: RateLimitDetails;

  constructor(details?: RateLimitDetails) {
    super(buildRateLimitMessage(details));
    this.name = "MissionEnrichmentRateLimitError";
    this.details = details;
  }
}
