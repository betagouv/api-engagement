import type {
  JSONObject,
  JSONSchema7,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3Message,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import { LoadAPIKeyError, UnsupportedFunctionalityError } from "@ai-sdk/provider";

import { ALBERT_API_KEY } from "@/config";

import type { AlbertChatCompletion, AlbertChatMessage } from "./types";

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

export const toAlbertMessages = (prompt: LanguageModelV3CallOptions["prompt"]): AlbertChatMessage[] =>
  prompt.map((message) => ({
    role: toAlbertRole(message.role),
    content: textFromParts(message),
  }));

export const buildResponseFormat = (responseFormat: LanguageModelV3CallOptions["responseFormat"]) => {
  if (!responseFormat || responseFormat.type === "text") {
    return undefined;
  }

  // Le SDK type responseFormat.schema comme JSONObject ; Albert attend un JSONSchema7 en mode strict.
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

export const mapFinishReason = (finishReason: string | null | undefined): LanguageModelV3GenerateResult["finishReason"] => {
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

export const mapUsage = (usage: AlbertChatCompletion["usage"]): LanguageModelV3Usage => ({
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

export const headersToRecord = (headers: Headers): Record<string, string> => Object.fromEntries(headers.entries());

export const getAlbertApiKey = (): string => {
  if (!ALBERT_API_KEY) {
    throw new LoadAPIKeyError({ message: "ALBERT_API_KEY is missing" });
  }
  return ALBERT_API_KEY;
};
