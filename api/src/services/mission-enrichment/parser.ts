import { fuzzyMatchKey } from "@/utils/string";

export type ClassificationInput = {
  dimension_key: string;
  value_key: string;
  confidence: number;
  evidence: { extract: string; reasoning: string };
};

export type ParsedClassification = ClassificationInput & {
  taxonomyValueId: string;
};

export type SkippedClassification = ClassificationInput & {
  reason: string;
};

type TaxonomyMeta = { type: string; values: Map<string, string> };

// taxonomyKey -> { type, values: valueKey -> taxonomyValueId }
export type TaxonomyLookup = Map<string, TaxonomyMeta>;

const FUZZY_MATCH_THRESHOLD = 0.6;

export const validateEnrichmentClassifications = (
  classifications: ClassificationInput[],
  taxonomyLookup: TaxonomyLookup,
  confidenceThreshold: number
): { valid: ParsedClassification[]; skipped: SkippedClassification[] } => {
  const valid: ParsedClassification[] = [];
  const skipped: SkippedClassification[] = [];

  for (const item of classifications) {
    const taxonomy = taxonomyLookup.get(item.dimension_key);
    if (!taxonomy) {
      skipped.push({ ...item, reason: `unknown_dimension: ${item.dimension_key}` });
      continue;
    }

    let resolvedKey = item.value_key;
    let taxonomyValueId = taxonomy.values.get(resolvedKey);

    if (!taxonomyValueId) {
      const match = fuzzyMatchKey(item.value_key, taxonomy.values.keys(), FUZZY_MATCH_THRESHOLD);
      if (match) {
        resolvedKey = match.key;
        taxonomyValueId = taxonomy.values.get(resolvedKey)!;
      } else {
        skipped.push({ ...item, reason: `unknown_value: ${item.dimension_key}.${item.value_key}` });
        continue;
      }
    }

    const normalizedItem = { ...item, value_key: resolvedKey };

    if (normalizedItem.confidence < confidenceThreshold) {
      skipped.push({ ...normalizedItem, reason: `below_threshold: ${normalizedItem.confidence} < ${confidenceThreshold}` });
      continue;
    }

    // Deduplicate same taxonomy.value_key — keep highest confidence
    const dedupeKey = `${normalizedItem.dimension_key}.${normalizedItem.value_key}`;
    const existingIndex = valid.findIndex((v) => `${v.dimension_key}.${v.value_key}` === dedupeKey);
    if (existingIndex !== -1) {
      if (normalizedItem.confidence > valid[existingIndex].confidence) {
        valid[existingIndex] = { ...normalizedItem, taxonomyValueId };
      }
      continue;
    }

    // For categorical taxonomies, only keep the single highest-confidence value
    if (taxonomy.type === "categorical") {
      const existingCategorical = valid.findIndex((v) => v.dimension_key === normalizedItem.dimension_key);
      if (existingCategorical !== -1) {
        if (normalizedItem.confidence > valid[existingCategorical].confidence) {
          skipped.push({ ...valid[existingCategorical], reason: `categorical_superseded: lower confidence than ${normalizedItem.value_key}` });
          valid[existingCategorical] = { ...normalizedItem, taxonomyValueId };
        } else {
          skipped.push({ ...normalizedItem, reason: `categorical_duplicate: ${normalizedItem.dimension_key} already has a higher confidence value` });
        }
        continue;
      }
    }

    valid.push({ ...normalizedItem, taxonomyValueId });
  }

  return { valid, skipped };
};
