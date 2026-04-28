import { getTaxonomyList } from "@engagement/taxonomy";
import type { TaxonomyKey } from "@engagement/taxonomy";

export const INDEXED_TAXONOMY_KEYS = getTaxonomyList().map((taxonomy) => taxonomy.key);

export type IndexedTaxonomyKey = TaxonomyKey;
