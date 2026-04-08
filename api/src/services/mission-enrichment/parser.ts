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

// dimensionKey -> valueKey -> taxonomyValueId
export type TaxonomyLookup = Map<string, Map<string, string>>;

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
    const dimensionMap = taxonomyLookup.get(item.dimension_key);
    if (!dimensionMap) {
      skipped.push({ ...item, reason: `unknown_dimension: ${item.dimension_key}` });
      continue;
    }

    const taxonomyValueId = dimensionMap.get(item.value_key);
    if (!taxonomyValueId) {
      skipped.push({ ...item, reason: `unknown_value: ${item.dimension_key}.${item.value_key}` });
      continue;
    }

    if (item.confidence < confidenceThreshold) {
      skipped.push({ ...item, reason: `below_threshold: ${item.confidence} < ${confidenceThreshold}` });
      continue;
    }

    valid.push({ ...item, taxonomyValueId });
  }

  return { valid, skipped };
};
