import { TAXONOMY } from "./taxonomy";
import { type TaxonomyKey, TaxonomyListItem, TaxonomyValueKey } from "./types";

export const ENRICHABLE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.enrichable).map(([k]) => k);

export const GATE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.gate).map(([k]) => k);

/** Vérifie qu'une clé plate "taxonomie.valeur" est valide au runtime. */
export function isValidTaxonomyValueKey(key: string): key is TaxonomyValueKey {
  const dot = key.indexOf(".");
  if (dot === -1) {
    return false;
  }
  const dim = key.slice(0, dot) as TaxonomyKey;
  const val = key.slice(dot + 1);
  if (!Object.prototype.hasOwnProperty.call(TAXONOMY, dim)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(TAXONOMY[dim].values, val);
}

/** Retourne la liste des taxonomies avec leurs valeurs, prête à l'affichage. */
export function getTaxonomyList(): TaxonomyListItem[] {
  return (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).map(([key, dim]) => ({
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
