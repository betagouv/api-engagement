export const CONFIDENCE_THRESHOLD = 0.3;
export const LLM_MAX_RETRIES = 5;
export const LLM_NO_OBJECT_MAX_RETRIES = 3;

// Défauts du job `update-mission-enrichment` (traitement parallèle).
// Le débit est plafonné par le TPM du provider, pas par la concurrence : à ~6k tokens/call et
// 246k TPM, la limite est ~41 calls/min. Avec ~5-6s de latence par call, ~4 requêtes en vol
// suffisent à saturer ce plafond. Le RPM par défaut garde une marge sous les 41 calls/min ; la
// concurrence n'est là que pour avoir assez de requêtes en vol malgré la latence.
export const DEFAULT_ENRICH_CONCURRENCY = 4;
export const DEFAULT_ENRICH_RPM = 38;

// Caps de longueur (en caractères) appliqués aux champs non fiables de la mission avant leur
// injection dans le prompt LLM. Défense contre l'injection de prompt et l'inflation de tokens.
export const PROMPT_FIELD_MAX_LENGTH = {
  title: 300,
  description: 5000,
  // nom d'organisation, schedule, tags et éléments de tableau courts
  short: 500,
  // descriptions et objets sociaux d'organisation (texte long)
  org: 2000,
} as const;

// Nombre maximal d'éléments retenus par champ de type tableau.
export const PROMPT_ARRAY_MAX_ITEMS = 30;
