import type { TaxonomyKey } from "@engagement/taxonomy";
import { getTaxonomyList } from "@engagement/taxonomy";

export const INDEXED_TAXONOMY_KEYS = getTaxonomyList().map((taxonomy) => taxonomy.key);

export type IndexedTaxonomyKey = TaxonomyKey;
