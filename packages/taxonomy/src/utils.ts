import { TAXONOMY } from "./taxonomy";
import type { TaxonomyKey, TaxonomyListItem, TaxonomyValueKey } from "./types";

export const ENRICHABLE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.enrichable).map(([k]) => k);

export const GATE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.gate).map(([k]) => k);

export type ParsedTaxonomyValueKey = {
  taxonomyKey: string;
  valueKey: string;
};

/** Parse une clé plate "taxonomie.valeur" sans valider son existence dans TAXONOMY. */
export function parseTaxonomyValueKey(key: string): ParsedTaxonomyValueKey | null {
  const dotIndex = key.indexOf(".");
  if (dotIndex <= 0 || dotIndex === key.length - 1) {
    return null;
  }

  return {
    taxonomyKey: key.slice(0, dotIndex),
    valueKey: key.slice(dotIndex + 1),
  };
}

/** Vérifie qu'une clé plate "taxonomie.valeur" est valide au runtime. */
export function isValidTaxonomyValueKey(key: string): key is TaxonomyValueKey {
  const parsedKey = parseTaxonomyValueKey(key);
  if (!parsedKey) {
    return false;
  }

  const taxonomyKey = parsedKey.taxonomyKey as TaxonomyKey;
  if (!Object.prototype.hasOwnProperty.call(TAXONOMY, taxonomyKey)) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(TAXONOMY[taxonomyKey].values, parsedKey.valueKey);
}

/** Retourne la liste des taxonomies avec leurs valeurs, prête à l'affichage. */
export function getTaxonomyList(): TaxonomyListItem[] {
  return (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).map(([key, dim]) => ({
    key,
    label: dim.label,
    type: dim.type,
    enrichable: dim.enrichable,
    gate: dim.gate,
    values: (Object.entries(dim.values) as [string, { label: string; sublabel?: string; icon: string | null; enrichable: boolean }][]).map(([vKey, val], i) => ({
      key: vKey,
      label: val.label,
      sublabel: val.sublabel,
      icon: val.icon,
      order: i,
      enrichable: val.enrichable,
    })),
  }));
}
