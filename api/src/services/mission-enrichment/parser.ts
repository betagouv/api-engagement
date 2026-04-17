import { z } from "zod";

const classificationItemSchema = z.object({
  dimension_key: z.string(),
  value_key: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.object({
    extract: z.string(),
    reasoning: z.string(),
  }),
});

export type ClassificationInput = z.infer<typeof classificationItemSchema>;

export type ParsedClassification = ClassificationInput & {
  taxonomyValueId: string;
};

export type SkippedClassification = ClassificationInput & {
  reason: string;
};

type TaxonomyMeta = { type: string; values: Map<string, string> };

// taxonomyKey -> { type, values: valueKey -> taxonomyValueId }
export type TaxonomyLookup = Map<string, TaxonomyMeta>;

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

    const taxonomyValueId = taxonomy.values.get(item.value_key);
    if (!taxonomyValueId) {
      skipped.push({ ...item, reason: `unknown_value: ${item.dimension_key}.${item.value_key}` });
      continue;
    }

    if (item.confidence < confidenceThreshold) {
      skipped.push({ ...item, reason: `below_threshold: ${item.confidence} < ${confidenceThreshold}` });
      continue;
    }

    // Deduplicate same taxonomy.value_key — keep highest confidence
    const dedupeKey = `${item.dimension_key}.${item.value_key}`;
    const existingIndex = valid.findIndex((v) => `${v.dimension_key}.${v.value_key}` === dedupeKey);
    if (existingIndex !== -1) {
      if (item.confidence > valid[existingIndex].confidence) {
        valid[existingIndex] = { ...item, taxonomyValueId };
      }
      continue;
    }

    // For categorical taxonomies, only keep the single highest-confidence value
    if (taxonomy.type === "categorical") {
      const existingCategorical = valid.findIndex((v) => v.dimension_key === item.dimension_key);
      if (existingCategorical !== -1) {
        if (item.confidence > valid[existingCategorical].confidence) {
          skipped.push({ ...valid[existingCategorical], reason: `categorical_superseded: lower confidence than ${item.value_key}` });
          valid[existingCategorical] = { ...item, taxonomyValueId };
        } else {
          skipped.push({ ...item, reason: `categorical_duplicate: ${item.dimension_key} already has a higher confidence value` });
        }
        continue;
      }
    }

    valid.push({ ...item, taxonomyValueId });
  }

  return { valid, skipped };
};
