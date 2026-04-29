import { albert } from "@/services/albert";

import { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage } from "./v2";

export const VERSION = "v3";
export const MODEL = albert("mistralai/Mistral-Small-3.2-24B-Instruct-2506");
export { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage };
