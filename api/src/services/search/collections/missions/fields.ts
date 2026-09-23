import type { TaxonomyKey } from "@engagement/taxonomy";

import { MISSION_TAXONOMY_FIELDS_V6 } from "./schemas/v6";

export const INDEXED_TAXONOMY_KEYS = MISSION_TAXONOMY_FIELDS_V6;
export const MISSION_BROWSE_FACET_FIELDS = [...INDEXED_TAXONOMY_KEYS, "departmentCodes"] as const;

export type IndexedTaxonomyKey = TaxonomyKey;
