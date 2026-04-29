import { albert } from "@/services/albert";

import { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt as buildV2SystemPrompt, buildUserMessage } from "./v2";

export const VERSION = "v3";
export const MODEL = albert("mistralai/Mistral-Small-3.2-24B-Instruct-2506");
export { ENRICHMENT_SCHEMA, TEMPERATURE, buildUserMessage };

export const buildSystemPrompt = (taxonomyBlock: string): string => buildV2SystemPrompt(taxonomyBlock).replaceAll("V2", "V3");
