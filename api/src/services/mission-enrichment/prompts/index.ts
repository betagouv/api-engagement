import type { EnrichableTaxonomyKey } from "@engagement/taxonomy";
import type { LanguageModel } from "ai";
import type { ZodTypeAny } from "zod";

import { MISSION_ENRICHMENT_PROMPT_VERSION } from "@/config";
import { captureMessage } from "@/error";

import * as v1 from "./v1";
import * as v2 from "./v2";
import * as v3 from "./v3";
import * as v4 from "./v4";
import * as v5 from "./v5";

export { buildMissionBlock, buildTaxonomyBlock, ENRICHMENT_TRIGGER_FIELDS } from "./builder";
export type { EnrichmentTriggerField } from "./builder";
export type { MissionForPrompt, TaxonomyForPrompt } from "./types";

export type PromptEntry = {
  VERSION: string;
  TAXONOMY_KEYS: readonly EnrichableTaxonomyKey[];
  TEMPERATURE: number;
  MODEL: LanguageModel;
  ENRICHMENT_SCHEMA: ZodTypeAny;
  buildSystemPrompt: (taxonomyBlock: string) => string;
  buildUserMessage: (missionBlock: string) => string;
};

export const PROMPT_REGISTRY = {
  [v1.VERSION]: v1,
  [v2.VERSION]: v2,
  [v3.VERSION]: v3,
  [v4.VERSION]: v4,
  [v5.VERSION]: v5,
} satisfies Record<string, PromptEntry>;

export type PromptVersion = keyof typeof PROMPT_REGISTRY;

export const isPromptVersion = (value: string): value is PromptVersion => value in PROMPT_REGISTRY;

/** Version de prompt utilisée par défaut si la variable d'env est absente ou invalide. */
export const DEFAULT_PROMPT_VERSION = v3.VERSION;

// Résout la version active depuis l'env. Une valeur inconnue (typo, version supprimée) retombe sur le
// défaut plutôt que de faire planter l'enrichissement (`PROMPT_REGISTRY[inconnu]` → undefined) ; on
// signale le fallback via Sentry pour ne pas masquer une mauvaise configuration.
const resolvePromptVersion = (raw: string): PromptVersion => {
  if (isPromptVersion(raw)) {
    return raw;
  }
  captureMessage(`[mission-enrichment] unknown prompt version "${raw}", falling back to "${DEFAULT_PROMPT_VERSION}"`);
  console.warn(`[mission-enrichment] unknown prompt version "${raw}", falling back to "${DEFAULT_PROMPT_VERSION}"`);
  return DEFAULT_PROMPT_VERSION;
};

/** Version de prompt active pour l'enrichissement et le scoring (pilotée par env, cf. `MISSION_ENRICHMENT_PROMPT_VERSION`). */
export const CURRENT_PROMPT_VERSION = resolvePromptVersion(MISSION_ENRICHMENT_PROMPT_VERSION);
