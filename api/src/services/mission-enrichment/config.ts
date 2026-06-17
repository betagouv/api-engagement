export const CONFIDENCE_THRESHOLD = 0.3;
export const CURRENT_PROMPT_VERSION = "v2" as const;
export const LLM_MAX_RETRIES = 5;
export const LLM_NO_OBJECT_MAX_RETRIES = 3;
export const JOB_ENRICH_SLEEP_MS = 500;

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
