import { APICallError, LoadAPIKeyError, UnsupportedFunctionalityError } from "@ai-sdk/provider";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";

const originalEnv = { ...process.env };

const baseOptions = {
  prompt: [
    { role: "system", content: "Tu réponds en JSON." },
    { role: "user", content: [{ type: "text", text: "Classifie cette mission." }] },
  ],
  responseFormat: {
    type: "json",
    name: "mission_enrichment",
    description: "Résultat d'enrichissement",
    schema: {
      type: "object",
      properties: {
        classifications: { type: "array" },
      },
      required: ["classifications"],
    },
  },
  temperature: 0,
} satisfies LanguageModelV3CallOptions;

const importAlbert = async () => {
  vi.resetModules();
  return import("@/services/albert");
};

describe("albert", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("calls Albert chat completions with AI SDK prompt and response format", async () => {
    process.env.ALBERT_API_KEY = "test-key";
    process.env.ALBERT_BASE_URL = "https://albert.test";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl-1",
          created: 1710000000,
          model: "mistral-test",
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: '{"classifications":[]}' } }],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { albert } = await importAlbert();
    const result = await albert("mistral-test").doGenerate(baseOptions);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://albert.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: "mistral-test",
      temperature: 0,
      stream: false,
      messages: [
        { role: "system", content: "Tu réponds en JSON." },
        { role: "user", content: "Classifie cette mission." },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mission_enrichment",
          description: "Résultat d'enrichissement",
          strict: true,
          schema: baseOptions.responseFormat.schema,
        },
      },
    });
    expect(result.content).toEqual([{ type: "text", text: '{"classifications":[]}' }]);
    expect(result.usage.inputTokens.total).toBe(12);
    expect(result.usage.outputTokens.total).toBe(5);
    expect(result.finishReason).toEqual({ unified: "stop", raw: "stop" });
  });

  it("requires ALBERT_API_KEY", async () => {
    delete process.env.ALBERT_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    const { albert } = await importAlbert();

    await expect(albert("mistral-test").doGenerate(baseOptions)).rejects.toBeInstanceOf(LoadAPIKeyError);
  });

  it("throws a retryable APICallError on Albert HTTP errors", async () => {
    process.env.ALBERT_API_KEY = "test-key";
    process.env.ALBERT_BASE_URL = "https://albert.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));

    const { albert } = await importAlbert();

    await expect(albert("mistral-test").doGenerate(baseOptions)).rejects.toMatchObject({
      statusCode: 503,
      responseBody: "busy",
      isRetryable: true,
    } satisfies Partial<APICallError>);
  });

  it("throws a non-retryable APICallError when Albert returns no content", async () => {
    process.env.ALBERT_API_KEY = "test-key";
    process.env.ALBERT_BASE_URL = "https://albert.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "x", choices: [] }), { status: 200, headers: { "content-type": "application/json" } })));

    const { albert } = await importAlbert();

    await expect(albert("mistral-test").doGenerate(baseOptions)).rejects.toMatchObject({
      message: "Albert returned no content",
      isRetryable: false,
    } satisfies Partial<APICallError>);
  });

  it("throws a non-retryable APICallError when Albert returns non-JSON", async () => {
    process.env.ALBERT_API_KEY = "test-key";
    process.env.ALBERT_BASE_URL = "https://albert.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Gateway Timeout</html>", { status: 200 })));

    const { albert } = await importAlbert();

    await expect(albert("mistral-test").doGenerate(baseOptions)).rejects.toMatchObject({
      message: expect.stringContaining("non-JSON"),
      isRetryable: false,
    } satisfies Partial<APICallError>);
  });

  it("rejects streaming and tools", async () => {
    process.env.ALBERT_API_KEY = "test-key";
    const { albert } = await importAlbert();
    const model = albert("mistral-test");

    await expect(model.doStream(baseOptions)).rejects.toBeInstanceOf(UnsupportedFunctionalityError);
    await expect(
      model.doGenerate({
        ...baseOptions,
        tools: [{ type: "function", name: "lookup", inputSchema: { type: "object" } }],
      })
    ).rejects.toBeInstanceOf(UnsupportedFunctionalityError);
  });
});
