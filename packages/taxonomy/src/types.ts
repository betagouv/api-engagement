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
  icon: string | null;
  order: number;
  enrichable: boolean;
};

export type TaxonomyListItem = {
  key: TaxonomyKey;
  label: string;
  type: "categorical" | "multi_value" | "gate";
  enrichable: boolean;
  gate: boolean;
  values: TaxonomyValueItem[];
};
