import { ALBERT_API_KEY, ALBERT_BASE_URL } from "@/config";
import { APICallError, LoadAPIKeyError, UnsupportedFunctionalityError } from "@ai-sdk/provider";
import type { JSONObject, JSONSchema7, LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3Message, LanguageModelV3Usage } from "@ai-sdk/provider";

type AlbertChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AlbertChatCompletion = {
  id?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      role?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const toAlbertRole = (role: LanguageModelV3Message["role"]): AlbertChatMessage["role"] => {
  if (role === "tool") {
    throw new UnsupportedFunctionalityError({ functionality: "tool messages" });
  }
  return role;
};

const textFromParts = (message: LanguageModelV3Message): string => {
  if (message.role === "system") {
    return message.content;
  }

  return message.content
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      throw new UnsupportedFunctionalityError({ functionality: `${part.type} prompt parts` });
    })
    .join("");
};

const toAlbertMessages = (prompt: LanguageModelV3CallOptions["prompt"]): AlbertChatMessage[] =>
  prompt.map((message) => ({
    role: toAlbertRole(message.role),
    content: textFromParts(message),
  }));

const buildResponseFormat = (responseFormat: LanguageModelV3CallOptions["responseFormat"]) => {
  if (!responseFormat || responseFormat.type === "text") {
    return undefined;
  }

  const schema = responseFormat.schema as JSONSchema7 | undefined;
  if (!schema) {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: responseFormat.name ?? "response",
      ...(responseFormat.description ? { description: responseFormat.description } : {}),
      schema,
      strict: true,
    },
  };
};

const mapFinishReason = (finishReason: string | null | undefined): LanguageModelV3GenerateResult["finishReason"] => {
  switch (finishReason) {
    case "stop":
      return { unified: "stop", raw: finishReason };
    case "length":
      return { unified: "length", raw: finishReason };
    case "content_filter":
      return { unified: "content-filter", raw: finishReason };
    case "tool_calls":
    case "function_call":
      return { unified: "tool-calls", raw: finishReason };
    default:
      return { unified: "other", raw: finishReason ?? undefined };
  }
};

const mapUsage = (usage: AlbertChatCompletion["usage"]): LanguageModelV3Usage => ({
  inputTokens: {
    total: usage?.prompt_tokens,
    noCache: usage?.prompt_tokens,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: usage?.completion_tokens,
    text: usage?.completion_tokens,
    reasoning: undefined,
  },
  raw: usage ? (usage as JSONObject) : undefined,
});

const headersToRecord = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
};

const getAlbertApiKey = (): string => {
  if (!ALBERT_API_KEY) {
    throw new LoadAPIKeyError({ message: "ALBERT_API_KEY is missing" });
  }
  return ALBERT_API_KEY;
};

export const albert = (modelId: string): LanguageModelV3 => ({
  specificationVersion: "v3",
  provider: "albert",
  modelId,
  supportedUrls: {},
  async doGenerate(options): Promise<LanguageModelV3GenerateResult> {
    if (options.tools?.length) {
      throw new UnsupportedFunctionalityError({ functionality: "tools" });
    }

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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAlbertApiKey()}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(requestBody),
      signal: options.abortSignal,
    });

    const responseBody = await response.text();
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

    const json = JSON.parse(responseBody) as AlbertChatCompletion;
    const choice = json.choices?.[0];
    const text = choice?.message?.content ?? "";

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
  async doStream() {
    throw new UnsupportedFunctionalityError({ functionality: "streaming" });
  },
});
