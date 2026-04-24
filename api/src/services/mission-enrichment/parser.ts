import { fuzzyMatchKey } from "@/utils/string";

export type ClassificationInput = {
  dimension_key: string;
  value_key: string;
  confidence: number;
  evidence: { extract: string; reasoning: string };
};

export type ParsedClassification = ClassificationInput & {
  taxonomyValueId: string | null;
};

export type SkippedClassification = ClassificationInput & {
  reason: string;
};

type TaxonomyMeta = { type: string; values: Map<string, { taxonomyValueId: string | null }> };

// taxonomyKey -> { type, values: valueKey -> legacy taxonomyValueId when available }
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
    let legacyValue = taxonomy.values.get(resolvedKey);

    if (!legacyValue) {
      const match = fuzzyMatchKey(item.value_key, taxonomy.values.keys(), FUZZY_MATCH_THRESHOLD);
      if (match) {
        resolvedKey = match.key;
        legacyValue = taxonomy.values.get(resolvedKey)!;
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
        valid[existingIndex] = { ...normalizedItem, taxonomyValueId: legacyValue.taxonomyValueId };
      }
      continue;
    }

    valid.push({ ...normalizedItem, taxonomyValueId: legacyValue.taxonomyValueId });
  }

  return { valid, skipped };
};
