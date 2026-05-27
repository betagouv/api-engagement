import { describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({ generateObject: vi.fn() }));

vi.mock("@/services/mission-enrichment/config", () => ({
  LLM_MAX_RETRIES: 3,
  LLM_NO_OBJECT_MAX_RETRIES: 1,
}));

vi.mock("@/services/mission-enrichment/prompts", () => ({
  PROMPT_REGISTRY: {},
}));

import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import { llmMissionEnrichmentProvider } from "@/services/mission-enrichment/providers/llm";
import { generateObject } from "ai";

const generateObjectMock = generateObject as ReturnType<typeof vi.fn>;

const promptVersion = { MODEL: {}, ENRICHMENT_SCHEMA: {}, TEMPERATURE: 0, buildSystemPrompt: () => "", buildUserMessage: () => "" };
const input = { systemPrompt: "sys", userMessage: "usr", promptVersion } as any;

const makeApiCallError = (statusCode: number) => Object.assign(new Error("api error"), { name: "AI_APICallError", statusCode });
const makeRetryError = (lastError: unknown) => Object.assign(new Error("retry error"), { name: "AI_RetryError", lastError });

describe("llmMissionEnrichmentProvider — rate limit detection", () => {
  it("throws MissionEnrichmentRateLimitError when AI_APICallError 429 surfaces directly (maxRetries=0)", async () => {
    generateObjectMock.mockRejectedValue(makeApiCallError(429));

    await expect(llmMissionEnrichmentProvider.generate(input)).rejects.toThrow(MissionEnrichmentRateLimitError);
  });

  it("throws MissionEnrichmentRateLimitError when AI_RetryError wraps a 429 (maxRetries exhausted)", async () => {
    generateObjectMock.mockRejectedValue(makeRetryError(makeApiCallError(429)));

    await expect(llmMissionEnrichmentProvider.generate(input)).rejects.toThrow(MissionEnrichmentRateLimitError);
  });

  it("does not swallow a non-429 AI_APICallError", async () => {
    generateObjectMock.mockRejectedValue(makeApiCallError(500));

    await expect(llmMissionEnrichmentProvider.generate(input)).rejects.toSatisfy((e: unknown) => (e as { name?: string }).name === "AI_APICallError");
  });

  it("does not swallow an AI_RetryError wrapping a non-429 error", async () => {
    generateObjectMock.mockRejectedValue(makeRetryError(makeApiCallError(503)));

    await expect(llmMissionEnrichmentProvider.generate(input)).rejects.toSatisfy((e: unknown) => (e as { name?: string }).name === "AI_RetryError");
  });
});
