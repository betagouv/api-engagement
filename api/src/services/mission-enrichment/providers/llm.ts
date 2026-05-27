import { LLM_MAX_RETRIES, LLM_NO_OBJECT_MAX_RETRIES } from "@/services/mission-enrichment/config";
import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import type { MissionEnrichmentProvider, MissionEnrichmentProviderInput, MissionEnrichmentProviderResult } from "@/services/mission-enrichment/providers/types";
import { generateObject } from "ai";

const LOG_PREFIX = "[mission-enrichment]";

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
          throw new MissionEnrichmentRateLimitError();
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
