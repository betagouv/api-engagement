import * as v1 from "./v1";

export const PROMPT_REGISTRY = {
  [v1.VERSION]: v1,
} as const;

export type PromptVersion = keyof typeof PROMPT_REGISTRY;
