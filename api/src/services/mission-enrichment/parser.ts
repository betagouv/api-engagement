import { fuzzyMatchKey } from "@/utils/string";

export type ClassificationInput = {
  taxonomy_key: string;
  value_key: string;
  confidence: number;
  evidence: { extract: string; reasoning: string };
};

export type ParsedClassification = ClassificationInput;

export type SkippedClassification = ClassificationInput & {
  reason: string;
};

type TaxonomyMeta = { type: string; values: Set<string> };

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
    const taxonomy = taxonomyLookup.get(item.taxonomy_key);
    if (!taxonomy) {
      skipped.push({ ...item, reason: `unknown_taxonomy: ${item.taxonomy_key}` });
      continue;
    }

    let resolvedKey = item.value_key;

    if (!taxonomy.values.has(resolvedKey)) {
      const match = fuzzyMatchKey(item.value_key, taxonomy.values, FUZZY_MATCH_THRESHOLD);
      if (match) {
        resolvedKey = match.key;
      } else {
        skipped.push({ ...item, reason: `unknown_value: ${item.taxonomy_key}.${item.value_key}` });
        continue;
      }
    }

    const normalizedItem = { ...item, value_key: resolvedKey };

    if (normalizedItem.confidence < confidenceThreshold) {
      skipped.push({ ...normalizedItem, reason: `below_threshold: ${normalizedItem.confidence} < ${confidenceThreshold}` });
      continue;
    }

    // Deduplicate same taxonomy.value_key — keep highest confidence
    const dedupeKey = `${normalizedItem.taxonomy_key}.${normalizedItem.value_key}`;
    const existingIndex = valid.findIndex((v) => `${v.taxonomy_key}.${v.value_key}` === dedupeKey);
    if (existingIndex !== -1) {
      if (normalizedItem.confidence > valid[existingIndex].confidence) {
        valid[existingIndex] = normalizedItem;
      }
      continue;
    }

    valid.push(normalizedItem);
  }

  return { valid, skipped };
};
