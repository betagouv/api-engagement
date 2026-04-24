import type { LanguageModel } from "ai";
import type { ZodTypeAny } from "zod";

import * as v1 from "./v1";
import * as v2 from "./v2";

export { buildMissionBlock, buildTaxonomyBlock } from "./builder";
export type { MissionForPrompt, TaxonomyForPrompt } from "./types";

export type PromptEntry = {
  VERSION: string;
  TEMPERATURE: number;
  MODEL: LanguageModel;
  ENRICHMENT_SCHEMA: ZodTypeAny;
  buildSystemPrompt: (taxonomyBlock: string) => string;
  buildUserMessage: (missionBlock: string) => string;
};

export const PROMPT_REGISTRY: Record<string, PromptEntry> = {
  [v1.VERSION]: v1,
  [v2.VERSION]: v2,
};

export type PromptVersion = keyof typeof PROMPT_REGISTRY;
