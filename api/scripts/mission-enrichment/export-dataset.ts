import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { prisma } from "@/db/postgres";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";
import { parseEnrichmentResponse, type TaxonomyLookup } from "@/services/mission-enrichment/parser";

// Pricing mistral-small-2603 (USD → EUR, taux fixe 0.93)
const INPUT_COST_PER_TOKEN = (0.15 / 1_000_000) * 0.93; // €0.0000001395
const OUTPUT_COST_PER_TOKEN = (0.6 / 1_000_000) * 0.93; // €0.000000558

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const version = getArg("--version") ?? CURRENT_PROMPT_VERSION;
const limit = getArg("--limit") ? parseInt(getArg("--limit")!, 10) : undefined;
const outputPath = getArg("--output") ?? "./enrichment-export.csv";

// ─── Taxonomy lookup ─────────────────────────────────────────────────────────

type DimensionMeta = { type: string; label: string; values: Map<string, { id: string; label: string }> };
type FullTaxonomyLookup = Map<string, DimensionMeta>;

const buildFullLookup = (dimensions: Array<{ key: string; type: string; label: string; values: Array<{ key: string; id: string; label: string; active: boolean }> }>): { taxonomyLookup: TaxonomyLookup; fullLookup: FullTaxonomyLookup } => {
  const taxonomyLookup: TaxonomyLookup = new Map();
  const fullLookup: FullTaxonomyLookup = new Map();

  for (const dim of dimensions) {
    const valueMap = new Map<string, string>();
    const fullValueMap = new Map<string, { id: string; label: string }>();

    for (const val of dim.values) {
      if (!val.active) continue;
      valueMap.set(val.key, val.id);
      fullValueMap.set(val.key, { id: val.id, label: val.label });
    }

    taxonomyLookup.set(dim.key, { type: dim.type, values: valueMap });
    fullLookup.set(dim.key, { type: dim.type, label: dim.label, values: fullValueMap });
  }

  return { taxonomyLookup, fullLookup };
};

// ─── CSV helpers ─────────────────────────────────────────────────────────────

const csvEscape = (value: string | null | undefined): string => {
  const str = (value ?? "").replace(/\n/g, " ").replace(/\r/g, "");
  return `"${str.replace(/"/g, '""')}"`;
};

const HEADERS = [
  "enrichmentId", "missionId", "title", "description",
  "promptVersion", "completedAt",
  "status", "skipReason",
  "dimension", "dimensionLabel", "value", "valueLabel",
  "confidence", "reasoning",
  "inputTokens", "outputTokens", "totalTokens", "costEuros",
];

type CsvRow = {
  enrichmentId: string;
  missionId: string;
  title: string;
  description: string;
  promptVersion: string;
  completedAt: string;
  status: "valid" | "skipped";
  skipReason: string;
  dimension: string;
  dimensionLabel: string;
  value: string;
  valueLabel: string;
  confidence: string;
  reasoning: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  costEuros: string;
};

const rowToCsv = (row: CsvRow): string =>
  HEADERS.map((h) => csvEscape(row[h as keyof CsvRow])).join(",");

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[export-dataset] version=${version} limit=${limit ?? "all"} output=${outputPath}`);

  const dimensions = await prisma.taxonomy.findMany({
    orderBy: { key: "asc" },
    include: { values: true },
  });

  const { taxonomyLookup, fullLookup } = buildFullLookup(
    dimensions.map((d) => ({
      key: d.key,
      type: d.type,
      label: d.label,
      values: d.values.map((v) => ({ key: v.key, id: v.id, label: v.label, active: v.active })),
    }))
  );

  const enrichments = await prisma.missionEnrichment.findMany({
    where: { status: "completed", promptVersion: version },
    take: limit,
    orderBy: { completedAt: "desc" },
    include: {
      mission: { select: { title: true, description: true } },
      values: {
        include: {
          taxonomyValue: {
            include: { taxonomy: { select: { key: true, label: true } } },
          },
        },
      },
    },
  });

  console.log(`[export-dataset] ${enrichments.length} enrichments found`);

  const rows: CsvRow[] = [];

  for (const enrichment of enrichments) {
    const { inputTokens, outputTokens, totalTokens } = enrichment;
    const costEuros = ((inputTokens ?? 0) * INPUT_COST_PER_TOKEN + (outputTokens ?? 0) * OUTPUT_COST_PER_TOKEN).toFixed(8);
    const description = (enrichment.mission?.description ?? "").slice(0, 300);
    const title = enrichment.mission?.title ?? "";

    const base = {
      enrichmentId: enrichment.id,
      missionId: enrichment.missionId,
      title,
      description,
      promptVersion: enrichment.promptVersion,
      completedAt: enrichment.completedAt?.toISOString() ?? "",
      inputTokens: String(inputTokens ?? ""),
      outputTokens: String(outputTokens ?? ""),
      totalTokens: String(totalTokens ?? ""),
      costEuros,
    };

    // Valid classifications from DB
    for (const v of enrichment.values) {
      const evidence = v.evidence as { reasoning?: string } | null;
      rows.push({
        ...base,
        status: "valid",
        skipReason: "",
        dimension: v.taxonomyValue.taxonomy.key,
        dimensionLabel: v.taxonomyValue.taxonomy.label,
        value: v.taxonomyValue.key,
        valueLabel: v.taxonomyValue.label,
        confidence: String(v.confidence),
        reasoning: evidence?.reasoning ?? "",
      });
    }

    // Skipped classifications from rawResponse
    if (enrichment.rawResponse) {
      try {
        const { skipped } = parseEnrichmentResponse(
          typeof enrichment.rawResponse === "string" ? enrichment.rawResponse : JSON.stringify(enrichment.rawResponse),
          taxonomyLookup,
          0, // threshold = 0 to recover all items (already filtered in valid)
        );

        for (const s of skipped) {
          const dimMeta = fullLookup.get(s.dimension_key);
          const valMeta = dimMeta?.values.get(s.value_key);
          rows.push({
            ...base,
            status: "skipped",
            skipReason: s.reason,
            dimension: s.dimension_key,
            dimensionLabel: dimMeta?.label ?? "",
            value: s.value_key,
            valueLabel: valMeta?.label ?? "",
            confidence: String(s.confidence),
            reasoning: s.evidence.reasoning,
          });
        }
      } catch {
        console.warn(`[export-dataset] could not re-parse rawResponse for enrichment ${enrichment.id}`);
      }
    }
  }

  const csv = [HEADERS.join(","), ...rows.map(rowToCsv)].join("\n");
  const resolvedPath = path.resolve(outputPath);
  fs.writeFileSync(resolvedPath, csv, "utf-8");

  const totalCost = enrichments.reduce((sum, e) => {
    return sum + (e.inputTokens ?? 0) * INPUT_COST_PER_TOKEN + (e.outputTokens ?? 0) * OUTPUT_COST_PER_TOKEN;
  }, 0);

  console.log(`[export-dataset] ${rows.length} rows written to ${resolvedPath}`);
  console.log(`[export-dataset] total cost: €${totalCost.toFixed(4)} for ${enrichments.length} enrichments`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
