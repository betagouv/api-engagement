import { ai } from "@/services/ai";

import { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage } from "./v2";

export const VERSION = "v3";
export const MODEL = ai.model("albert", "mistralai/Mistral-Small-3.2-24B-Instruct-2506");
export { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage };
