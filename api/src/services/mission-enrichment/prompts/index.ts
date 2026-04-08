import type { LanguageModel } from "ai";

import * as v1 from "./v1";

export { buildMissionBlock, buildTaxonomyBlock } from "./builder";
export type { MissionForPrompt, TaxonomyForPrompt } from "./types";

export type PromptEntry = {
  VERSION: string;
  MODEL: LanguageModel;
  buildSystemPrompt: (taxonomyBlock: string) => string;
  buildUserMessage: (missionBlock: string) => string;
};

export const PROMPT_REGISTRY: Record<string, PromptEntry> = {
  [v1.VERSION]: v1,
};

export type PromptVersion = keyof typeof PROMPT_REGISTRY;
