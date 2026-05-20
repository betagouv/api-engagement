import type { JSONObject, LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { APICallError, UnsupportedFunctionalityError } from "@ai-sdk/provider";

import { ALBERT_BASE_URL } from "@/config";

import type { AlbertChatCompletion } from "./types";
import { buildResponseFormat, getAlbertApiKey, headersToRecord, mapFinishReason, mapUsage, toAlbertMessages } from "./utils";

export const createAlbertLanguageModel = (modelId: string): LanguageModelV3 => ({
  specificationVersion: "v3",
  provider: "albert",
  modelId,
  supportedUrls: {},
  async doGenerate(options): Promise<LanguageModelV3GenerateResult> {
    if (options.tools?.length) {
      throw new UnsupportedFunctionalityError({ functionality: "tools" });
    }

    const apiKey = getAlbertApiKey();
    const url = `${ALBERT_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`;
    const requestBody = {
      model: modelId,
      messages: toAlbertMessages(options.prompt),
      temperature: options.temperature,
      max_completion_tokens: options.maxOutputTokens,
      stop: options.stopSequences,
      top_p: options.topP,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
      response_format: buildResponseFormat(options.responseFormat),
      stream: false,
    };

    let response: Response;
    let responseBody: string;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(requestBody),
        signal: options.abortSignal,
      });
      responseBody = await response.text();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      throw new APICallError({
        message: `Albert network error: ${err instanceof Error ? err.message : String(err)}`,
        url,
        requestBodyValues: requestBody,
        cause: err,
        isRetryable: true,
      });
    }
    if (!response.ok) {
      throw new APICallError({
        message: `Albert API error ${response.status}: ${responseBody}`,
        url,
        requestBodyValues: requestBody,
        statusCode: response.status,
        responseHeaders: headersToRecord(response.headers),
        responseBody,
        isRetryable: response.status === 429 || response.status >= 500,
      });
    }

    let json: AlbertChatCompletion;
    try {
      json = JSON.parse(responseBody) as AlbertChatCompletion;
    } catch {
      throw new APICallError({
        message: `Albert returned non-JSON response: ${responseBody.slice(0, 200)}`,
        url,
        requestBodyValues: requestBody,
        statusCode: response.status,
        responseHeaders: headersToRecord(response.headers),
        responseBody,
        isRetryable: false,
      });
    }

    const choice = json.choices?.[0];
    const text = choice?.message?.content;
    if (text == null) {
      throw new APICallError({
        message: "Albert returned no content",
        url,
        requestBodyValues: requestBody,
        statusCode: response.status,
        responseHeaders: headersToRecord(response.headers),
        responseBody,
        isRetryable: false,
      });
    }

    return {
      content: [{ type: "text", text }],
      finishReason: mapFinishReason(choice?.finish_reason),
      usage: mapUsage(json.usage),
      request: { body: requestBody },
      response: {
        id: json.id,
        timestamp: json.created ? new Date(json.created * 1000) : undefined,
        modelId: json.model,
        headers: headersToRecord(response.headers),
        body: json as JSONObject,
      },
      warnings: [],
    };
  },
  async doStream(_options: LanguageModelV3CallOptions) {
    throw new UnsupportedFunctionalityError({ functionality: "streaming" });
  },
});
