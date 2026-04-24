import { TAXONOMY } from "./taxonomy";

// ─── Types de base ────────────────────────────────────────────────────────────

export type DimensionKey = keyof typeof TAXONOMY;

export type ValueKey<D extends DimensionKey> = keyof (typeof TAXONOMY)[D]["values"];

/** Clé plate "dimension.valeur" utilisée dans les payloads API. */
export type TaxonomyValueKey = {
  [D in DimensionKey]: `${D}.${keyof (typeof TAXONOMY)[D]["values"] & string}`;
}[DimensionKey];

// ─── Sous-ensembles filtrés ───────────────────────────────────────────────────

/** Dimensions classifiées par le LLM (mission-enrichment). */
export type EnrichableDimensionKey = {
  [D in DimensionKey]: (typeof TAXONOMY)[D]["enrichable"] extends true ? D : never;
}[DimensionKey];

/** Dimensions utilisées comme filtre dur dans le matching engine. */
export type GateDimensionKey = {
  [D in DimensionKey]: (typeof TAXONOMY)[D]["gate"] extends true ? D : never;
}[DimensionKey];

// ─── Helpers runtime ─────────────────────────────────────────────────────────

export const ENRICHABLE_DIMENSIONS = (Object.entries(TAXONOMY) as [DimensionKey, (typeof TAXONOMY)[DimensionKey]][]).filter(([, d]) => d.enrichable).map(([k]) => k);

export const GATE_DIMENSIONS = (Object.entries(TAXONOMY) as [DimensionKey, (typeof TAXONOMY)[DimensionKey]][]).filter(([, d]) => d.gate).map(([k]) => k);

/** Vérifie qu'une clé plate "dimension.valeur" est valide au runtime. */
export function isValidTaxonomyValueKey(key: string): key is TaxonomyValueKey {
  const dot = key.indexOf(".");
  if (dot === -1) return false;
  const dim = key.slice(0, dot) as DimensionKey;
  const val = key.slice(dot + 1);
  return dim in TAXONOMY && val in TAXONOMY[dim].values;
}

// ─── Format liste (pour les UIs) ─────────────────────────────────────────────

export type TaxonomyValueItem = {
  key: string;
  label: string;
  icon: string | null;
  order: number;
  enrichable: boolean;
};

export type TaxonomyListItem = {
  key: DimensionKey;
  label: string;
  type: "categorical" | "multi_value" | "gate";
  enrichable: boolean;
  gate: boolean;
  values: TaxonomyValueItem[];
};

/** Retourne la liste des dimensions avec leurs valeurs, prête à l'affichage. */
export function getTaxonomyList(): TaxonomyListItem[] {
  return (Object.entries(TAXONOMY) as [DimensionKey, (typeof TAXONOMY)[DimensionKey]][]).map(([key, dim]) => ({
    key,
    label: dim.label,
    type: dim.type,
    enrichable: dim.enrichable,
    gate: dim.gate,
    values: (Object.entries(dim.values) as [string, { label: string; icon: string | null; enrichable: boolean }][]).map(([vKey, val], i) => ({
      key: vKey,
      label: val.label,
      icon: val.icon,
      order: i,
      enrichable: val.enrichable,
    })),
  }));
}
