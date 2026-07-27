import { ai } from "@/services/ai";
import type { EnrichableTaxonomyKey } from "@engagement/taxonomy";

import { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage } from "./v3";

/**
 * v4 ≡ prompt v3 exécuté sur Albert (mistralai/Mistral-Small-3.2-24B-Instruct-2506).
 * Ce n'est PAS une itération de prompt : le schéma, la température et les guidances sont ceux de v3.
 * Seul le MODEL (provider + modèle) change, pour comparer les providers à prompt identique (A/B).
 */
export const VERSION = "v4";
export const TAXONOMY_KEYS = [
  "domaine",
  "secteur_activite",
  "type_mission",
  "competence_rome",
  "region_internationale",
  "engagement_intent",
  "formation_onisep",
] as const satisfies readonly EnrichableTaxonomyKey[];
export const MODEL = ai.model("albert", "mistralai/Mistral-Small-3.2-24B-Instruct-2506");
export { ENRICHMENT_SCHEMA, TEMPERATURE, buildSystemPrompt, buildUserMessage };
