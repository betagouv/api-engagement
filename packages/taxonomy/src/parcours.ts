// Version parapluie du parcours de recommandation : chaque entrée épingle un triplet cohérent
// (quiz / enrichment / matching). C'est la SOURCE UNIQUE consommée par l'API (versions matching +
// enrichment) et par plateform (version quiz), pilotée par une seule env var `PARCOURS_VERSION`
// définie une fois par environnement. Bumper un seul élément = ajouter une entrée `pN` ici, ce qui
// garde les préfixes q*/v*/m* (tracking + clés DB intacts) et le recompute ciblé (deux parcours
// peuvent réutiliser le même v*/m* → pas de ré-enrichissement/re-scoring forcé).

export type ParcoursConfig = {
  /** Clé du QUIZ_FLOW_REGISTRY (plateform). */
  quiz: string;
  /** Clé du PROMPT_REGISTRY d'enrichissement (api). */
  enrichment: string;
  /** Clé du MATCHING_ENGINE_VERSIONS (api). */
  matching: string;
};

export const PARCOURS_REGISTRY = {
  p1: { quiz: "q3", enrichment: "v5", matching: "m5" },
} as const satisfies Record<string, ParcoursConfig>;

export type ParcoursVersion = keyof typeof PARCOURS_REGISTRY;

/** Parcours actif par défaut si `PARCOURS_VERSION` est absente ou invalide. */
export const DEFAULT_PARCOURS_VERSION: ParcoursVersion = "p1";

export const isParcoursVersion = (value: string): value is ParcoursVersion => Object.prototype.hasOwnProperty.call(PARCOURS_REGISTRY, value);

/** Résout le triplet actif depuis l'env. Valeur inconnue → défaut (pas de crash au boot). */
export const resolveParcours = (raw: string | undefined): ParcoursConfig => PARCOURS_REGISTRY[raw && isParcoursVersion(raw) ? raw : DEFAULT_PARCOURS_VERSION];
