const DIFFUSION_TRIGGER_FIELDS = new Set(["publisherId", "publisherOrganizationId", "deletedAt"]);

/**
 * Champs de mission qui peuvent modifier son appartenance à `mission_diffusion`.
 * Ce prédicat reste séparé de l'enrichissement : une mission peut devoir être
 * rematérialisée sans nouvel appel au fournisseur LLM.
 */
export const changesRequireDiffusion = (changes: Record<string, unknown>): boolean =>
  Object.keys(changes).some((field) => DIFFUSION_TRIGGER_FIELDS.has(field));
