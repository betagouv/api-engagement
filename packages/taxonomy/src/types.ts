import { TAXONOMY } from "./taxonomy";

// ─── Types de base ────────────────────────────────────────────────────────────

export type TaxonomyKey = keyof typeof TAXONOMY;

export type ValueKey<D extends TaxonomyKey> = keyof (typeof TAXONOMY)[D]["values"];

/** Clé plate "taxonomie.valeur" utilisée dans les payloads API. */
export type TaxonomyValueKey = {
  [D in TaxonomyKey]: `${D}.${keyof (typeof TAXONOMY)[D]["values"] & string}`;
}[TaxonomyKey];

// ─── Sous-ensembles filtrés ───────────────────────────────────────────────────

export type EnrichableTaxonomyKey = {
  [D in TaxonomyKey]: (typeof TAXONOMY)[D]["enrichable"] extends true ? D : never;
}[TaxonomyKey];

export type GateTaxonomyKey = {
  [D in TaxonomyKey]: (typeof TAXONOMY)[D]["gate"] extends true ? D : never;
}[TaxonomyKey];

// ─── Format liste (pour les UIs) ─────────────────────────────────────────────

export type TaxonomyValueItem = {
  key: string;
  label: string;
  sublabel?: string;
  icon: string | null;
  order: number;
  enrichable: boolean;
  hidden?: boolean;
  disabled?: boolean;
  // Valeur « je ne sais pas » / « peu importe » : réponse sans signal, exclue du scoring
  // pour ne pas diluer le taxonomy_score (cf. NEUTRAL_TAXONOMY_VALUE_KEYS).
  neutral?: boolean;
};

export type TaxonomyListItem = {
  key: TaxonomyKey;
  label: string;
  type: "categorical" | "multi_value" | "gate" | "value";
  enrichable: boolean;
  gate: boolean;
  values: TaxonomyValueItem[];
};
