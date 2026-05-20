import type { TaxonomyKey } from "@engagement/taxonomy";

import { MISSION_TAXONOMY_FIELDS_V1 } from "./schemas/v1";

export const INDEXED_TAXONOMY_KEYS = MISSION_TAXONOMY_FIELDS_V1;

export type IndexedTaxonomyKey = TaxonomyKey;
