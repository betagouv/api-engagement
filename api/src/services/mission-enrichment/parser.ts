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

const classificationResponseSchema = z.object({
  classifications: z.array(classificationItemSchema),
});

export type ParsedClassification = z.infer<typeof classificationItemSchema> & {
  taxonomyValueId: string;
};

export type SkippedClassification = z.infer<typeof classificationItemSchema> & {
  reason: string;
};

type DimensionMeta = { type: string; values: Map<string, string> };

// dimensionKey -> { type, values: valueKey -> taxonomyValueId }
export type TaxonomyLookup = Map<string, DimensionMeta>;

const extractJson = (raw: string): string => {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return raw.trim();
};

export const parseEnrichmentResponse = (
  rawText: string,
  taxonomyLookup: TaxonomyLookup,
  confidenceThreshold: number
): { valid: ParsedClassification[]; skipped: SkippedClassification[] } => {
  const jsonStr = extractJson(rawText);
  const parsed = classificationResponseSchema.parse(JSON.parse(jsonStr));

  const valid: ParsedClassification[] = [];
  const skipped: SkippedClassification[] = [];

  for (const item of parsed.classifications) {
    const dimension = taxonomyLookup.get(item.dimension_key);
    if (!dimension) {
      skipped.push({ ...item, reason: `unknown_dimension: ${item.dimension_key}` });
      continue;
    }

    const taxonomyValueId = dimension.values.get(item.value_key);
    if (!taxonomyValueId) {
      skipped.push({ ...item, reason: `unknown_value: ${item.dimension_key}.${item.value_key}` });
      continue;
    }

    if (item.confidence < confidenceThreshold) {
      skipped.push({ ...item, reason: `below_threshold: ${item.confidence} < ${confidenceThreshold}` });
      continue;
    }

    // Deduplicate same dimension.value_key — keep highest confidence
    const dedupeKey = `${item.dimension_key}.${item.value_key}`;
    const existingIndex = valid.findIndex((v) => `${v.dimension_key}.${v.value_key}` === dedupeKey);
    if (existingIndex !== -1) {
      if (item.confidence > valid[existingIndex].confidence) {
        valid[existingIndex] = { ...item, taxonomyValueId };
      }
      continue;
    }

    // For categorical dimensions, only keep the single highest-confidence value
    if (dimension.type === "categorical") {
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
