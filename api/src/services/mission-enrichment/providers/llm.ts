import { LLM_MAX_RETRIES, LLM_NO_OBJECT_MAX_RETRIES } from "@/services/mission-enrichment/config";
import type { RateLimitDetails } from "@/services/mission-enrichment/errors";
import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import type { MissionEnrichmentProvider, MissionEnrichmentProviderInput, MissionEnrichmentProviderResult } from "@/services/mission-enrichment/providers/types";
import { generateObject } from "ai";

const LOG_PREFIX = "[mission-enrichment]";

const RESPONSE_BODY_MAX_LENGTH = 500;

// Repère les headers portant l'info de rate-limit (retry-after, x-ratelimit-*, ratelimitbysize-*, …).
// On normalise en retirant les séparateurs pour couvrir les variantes de nommage entre providers.
const isRateLimitHeader = (key: string): boolean => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.includes("ratelimit") || normalized.includes("retryafter");
};

// Extrait de l'APICallError 429 les infos utiles au diagnostic (quelle limite, chez quel provider).
// L'APICallError porte déjà responseHeaders/responseBody/statusCode ; on les propage sans nouvel appel.
export const extractRateLimitDetails = (rootError: unknown, provider?: string): RateLimitDetails => {
  const err = (rootError ?? {}) as { statusCode?: number; responseHeaders?: Record<string, string>; responseBody?: string; data?: { detail?: string } };
  const responseHeaders = err.responseHeaders;

  const normalizedHeaders: Record<string, string> = {};
  const rateLimitHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(responseHeaders ?? {})) {
    const lowerKey = key.toLowerCase();
    normalizedHeaders[lowerKey] = value;
    if (isRateLimitHeader(lowerKey)) {
      rateLimitHeaders[lowerKey] = value;
    }
  }

  const responseBody = err.responseBody;

  return {
    provider,
    statusCode: err.statusCode,
    retryAfter: normalizedHeaders["retry-after"],
    // `data.detail` est renseigné par les providers qui savent parser leur corps d'erreur (ex. Albert).
    detail: err.data?.detail,
    rateLimitHeaders: Object.keys(rateLimitHeaders).length ? rateLimitHeaders : undefined,
    responseHeaders: Object.keys(normalizedHeaders).length ? normalizedHeaders : undefined,
    responseBody: responseBody ? responseBody.slice(0, RESPONSE_BODY_MAX_LENGTH) : undefined,
  };
};

export const llmMissionEnrichmentProvider: MissionEnrichmentProvider = {
  async generate({ systemPrompt, userMessage, promptVersion }: MissionEnrichmentProviderInput): Promise<MissionEnrichmentProviderResult> {
    for (let attempt = 1; attempt <= LLM_NO_OBJECT_MAX_RETRIES; attempt++) {
      try {
        const result = await generateObject({
          model: promptVersion.MODEL,
          schema: promptVersion.ENRICHMENT_SCHEMA,
          system: systemPrompt,
          prompt: userMessage,
          maxRetries: LLM_MAX_RETRIES,
          temperature: promptVersion.TEMPERATURE,
        });

        return result as MissionEnrichmentProviderResult;
      } catch (error) {
        // AI SDK wraps repeated 429s in AI_RetryError (lastError = AI_APICallError) once maxRetries is
        // exhausted. When maxRetries is 0 the raw AI_APICallError surfaces directly — handle both.
        const rootError = (error as { name?: string })?.name === "AI_RetryError" ? (error as { lastError?: unknown })?.lastError : error;
        const isRateLimit = (rootError as { name?: string })?.name === "AI_APICallError" && (rootError as { statusCode?: number })?.statusCode === 429;
        if (isRateLimit) {
          const provider = (promptVersion.MODEL as { provider?: string })?.provider;
          throw new MissionEnrichmentRateLimitError(extractRateLimitDetails(rootError, provider));
        }
        const isNoObject = (error as { name?: string })?.name === "AI_NoObjectGeneratedError";
        if (isNoObject && attempt < LLM_NO_OBJECT_MAX_RETRIES) {
          console.warn(`${LOG_PREFIX} AI_NoObjectGeneratedError — retry ${attempt}/${LLM_NO_OBJECT_MAX_RETRIES}`);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`${LOG_PREFIX} no LLM result after retries`);
  },
};
