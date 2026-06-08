import { ENRICHMENT_TRIGGER_FIELDS } from "@/services/mission-enrichment/prompts";

const ENRICHMENT_TRIGGER_FIELD_SET = new Set<string>(ENRICHMENT_TRIGGER_FIELDS);

/**
 * Détermine si un diff de mission justifie un ré-enrichissement.
 *
 * La majorité des updates d'import portent sur des champs hors-prompt
 * (compteurs, localisation, dates glissantes, durée dérivée). On ne ré-enrichit
 * que si un champ réellement consommé par le prompt a changé. `deletedAt`
 * force aussi le retraitement pour propager suppression/restauration.
 */
export const changesRequireEnrichment = (changes: Record<string, unknown>): boolean =>
  Object.keys(changes).some((field) => field === "deletedAt" || ENRICHMENT_TRIGGER_FIELD_SET.has(field));
