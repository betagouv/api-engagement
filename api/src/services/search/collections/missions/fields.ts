import type { TaxonomyKey } from "@engagement/taxonomy";

import { MISSION_TAXONOMY_FIELDS_V3 } from "./schemas/v3";

export const INDEXED_TAXONOMY_KEYS = MISSION_TAXONOMY_FIELDS_V3;
export const MISSION_BROWSE_FACET_FIELDS = [...INDEXED_TAXONOMY_KEYS, "departmentCodes"] as const;

export type IndexedTaxonomyKey = TaxonomyKey;
