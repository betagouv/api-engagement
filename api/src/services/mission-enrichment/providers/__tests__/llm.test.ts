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

const makeApiCallError = (statusCode: number, extra: Record<string, unknown> = {}) => Object.assign(new Error("api error"), { name: "AI_APICallError", statusCode, ...extra });
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

  it("surfaces rate-limit details (provider, retry-after, rate-limit headers, body) on the thrown error", async () => {
    generateObjectMock.mockRejectedValue(
      makeApiCallError(429, {
        responseHeaders: {
          "Retry-After": "12",
          "X-RateLimit-Remaining-Requests": "0",
          "content-type": "application/json",
        },
        responseBody: "Rate limit exceeded: 60 requests per minute",
      })
    );
    const inputWithProvider = { ...input, promptVersion: { ...promptVersion, MODEL: { provider: "albert" } } };

    const error = await llmMissionEnrichmentProvider.generate(inputWithProvider).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MissionEnrichmentRateLimitError);
    const { details, message } = error as MissionEnrichmentRateLimitError;
    expect(details).toMatchObject({
      provider: "albert",
      statusCode: 429,
      retryAfter: "12",
      rateLimitHeaders: { "retry-after": "12", "x-ratelimit-remaining-requests": "0" },
      responseBody: "Rate limit exceeded: 60 requests per minute",
    });
    // le content-type est conservé dans responseHeaders mais exclu du sous-ensemble rate-limit
    expect(details?.rateLimitHeaders).not.toHaveProperty("content-type");
    expect(details?.responseHeaders).toHaveProperty("content-type", "application/json");
    expect(message).toContain("provider=albert");
    expect(message).toContain("retry-after=12");
    expect(message).toContain("x-ratelimit-remaining-requests=0");
  });

  it("extracts the limit from Albert's JSON body when no rate-limit header is present", async () => {
    generateObjectMock.mockRejectedValue(
      makeApiCallError(429, {
        responseHeaders: { "content-type": "application/json", server: "nginx/1.29.3" },
        responseBody: '{"detail":"2460000 input tokens per day exceeded (remaining: 0)."}',
      })
    );
    const inputWithProvider = { ...input, promptVersion: { ...promptVersion, MODEL: { provider: "albert" } } };

    const error = await llmMissionEnrichmentProvider.generate(inputWithProvider).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MissionEnrichmentRateLimitError);
    const { details, message } = error as MissionEnrichmentRateLimitError;
    expect(details?.detail).toBe("2460000 input tokens per day exceeded (remaining: 0).");
    expect(details?.rateLimitHeaders).toBeUndefined();
    expect(message).toContain("provider=albert");
    expect(message).toContain("2460000 input tokens per day exceeded (remaining: 0).");
  });
});
