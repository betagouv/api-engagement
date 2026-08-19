import { TAXONOMY } from "./taxonomy";
import type { TaxonomyKey, TaxonomyListItem, TaxonomyValueKey } from "./types";

export const ENRICHABLE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.enrichable).map(([k]) => k);

export const GATE_TAXONOMIES = (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).filter(([, d]) => d.gate).map(([k]) => k);

// Clés plates "taxonomie.valeur" des réponses « je ne sais pas » / « peu importe ». Elles n'apportent
// aucun signal (aucune mission ne les porte) et diluent le taxonomy_score si elles restent au
// dénominateur : elles sont filtrées à l'écriture des réponses utilisateur (cf. user-scoring service).
export const NEUTRAL_TAXONOMY_VALUE_KEYS: ReadonlySet<string> = new Set(
  (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).flatMap(([taxonomyKey, d]) =>
    (Object.entries(d.values) as [string, { neutral?: boolean }][]).filter(([, v]) => v.neutral === true).map(([valueKey]) => `${taxonomyKey}.${valueKey}`)
  )
);

/** Indique si une réponse (taxonomie + valeur) est une valeur neutre « je ne sais pas » / « peu importe ». */
export function isNeutralTaxonomyValueKey(taxonomyKey: string, valueKey: string): boolean {
  return NEUTRAL_TAXONOMY_VALUE_KEYS.has(`${taxonomyKey}.${valueKey}`);
}

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

/** Tags à afficher sur une carte mission quand la valeur (taxonomie + valeur) a matché. */
export function getTaxonomyValueTags(taxonomyKey: string, valueKey: string): string[] {
  if (!Object.prototype.hasOwnProperty.call(TAXONOMY, taxonomyKey)) {
    return [];
  }

  const values = TAXONOMY[taxonomyKey as TaxonomyKey].values as Record<string, { tags?: readonly string[] }>;
  return [...(values[valueKey]?.tags ?? [])];
}

/** Retourne la liste des taxonomies avec leurs valeurs, prête à l'affichage. */
export function getTaxonomyList(): TaxonomyListItem[] {
  return (Object.entries(TAXONOMY) as [TaxonomyKey, (typeof TAXONOMY)[TaxonomyKey]][]).map(([key, dim]) => ({
    key,
    label: dim.label,
    type: dim.type,
    enrichable: dim.enrichable,
    gate: dim.gate,
    values: (
      Object.entries(dim.values) as [
        string,
        { label: string; sublabel?: string; icon: string | null; enrichable: boolean; hidden?: boolean; disabled?: boolean; neutral?: boolean },
      ][]
    ).map(([vKey, val], i) => ({
      key: vKey,
      label: val.label,
      sublabel: val.sublabel,
      icon: val.icon,
      order: i,
      enrichable: val.enrichable,
      hidden: val.hidden,
      disabled: val.disabled,
      neutral: val.neutral,
    })),
  }));
}
