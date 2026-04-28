import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/config";
import { fuzzyMatchKey } from "@/utils/string";

import fs from "fs";
import path from "path";

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

type TaxonomyMeta = { type: string; label: string; values: Map<string, { label: string }> };
type FullTaxonomyLookup = Map<string, TaxonomyMeta>;

const buildFullLookup = (
  taxonomies: Array<{ key: string; type: string; label: string; values: Array<{ key: string; label: string; active: boolean }> }>
): FullTaxonomyLookup => {
  const fullLookup: FullTaxonomyLookup = new Map();

  for (const dim of taxonomies) {
    const fullValueMap = new Map<string, { label: string }>();

    for (const val of dim.values) {
      if (!val.active) {
        continue;
      }
      fullValueMap.set(val.key, { label: val.label });
    }

    fullLookup.set(dim.key, { type: dim.type, label: dim.label, values: fullValueMap });
  }

  return fullLookup;
};

type RawClassification = {
  taxonomy_key: string;
  value_key: string;
  confidence: number;
  evidence: { extract: string; reasoning: string };
};

type SkippedClassification = RawClassification & {
  reason: string;
};

const FUZZY_MATCH_THRESHOLD = 0.6;

const getSkippedClassifications = (classifications: RawClassification[], fullLookup: FullTaxonomyLookup): SkippedClassification[] => {
  const skipped: SkippedClassification[] = [];

  for (const item of classifications) {
    const taxonomy = fullLookup.get(item.taxonomy_key);
    if (!taxonomy) {
      skipped.push({ ...item, reason: `unknown_taxonomy: ${item.taxonomy_key}` });
      continue;
    }

    if (taxonomy.values.has(item.value_key)) {
      continue;
    }

    const match = fuzzyMatchKey(item.value_key, taxonomy.values.keys(), FUZZY_MATCH_THRESHOLD);
    if (!match) {
      skipped.push({ ...item, reason: `unknown_value: ${item.taxonomy_key}.${item.value_key}` });
    }
  }

  return skipped;
};

// ─── CSV helpers ─────────────────────────────────────────────────────────────

const csvEscape = (value: string | null | undefined): string => {
  const str = (value ?? "").replace(/\n/g, " ").replace(/\r/g, "");
  return `"${str.replace(/"/g, '""')}"`;
};

const HEADERS = [
  "missionId",
  "title",
  "description",
  "applicationUrl",
  "backofficUrl",
  "publisherName",
  "missionType",
  "domainName",
  "activity",
  "promptVersion",
  "completedAt",
  "status",
  "skipReason",
  "taxonomy",
  "taxonomyLabel",
  "value",
  "valueLabel",
  "confidence",
  "reasoning",
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "costEuros",
];

type CsvRow = {
  missionId: string;
  title: string;
  description: string;
  applicationUrl: string;
  backofficUrl: string;
  publisherName: string;
  missionType: string;
  domainName: string;
  activity: string;
  promptVersion: string;
  completedAt: string;
  status: "valid" | "skipped";
  skipReason: string;
  taxonomy: string;
  taxonomyLabel: string;
  value: string;
  valueLabel: string;
  confidence: string;
  reasoning: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  costEuros: string;
};

const rowToCsv = (row: CsvRow): string => HEADERS.map((h) => csvEscape(row[h as keyof CsvRow])).join(",");

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[export-dataset] version=${version} limit=${limit ?? "all"} output=${outputPath}`);

  const taxonomies = await prisma.taxonomy.findMany({
    orderBy: { key: "asc" },
    include: { values: true },
  });

  const fullLookup = buildFullLookup(
    taxonomies.map((d) => ({
      key: d.key,
      type: d.type,
      label: d.label,
      values: d.values.map((v) => ({ key: v.key, label: v.label, active: v.active })),
    }))
  );

  const enrichments = await prisma.missionEnrichment.findMany({
    where: { status: "completed", promptVersion: version },
    take: limit,
    orderBy: { completedAt: "desc" },
    include: {
      mission: {
        select: {
          title: true,
          description: true,
          applicationUrl: true,
          publisherId: true,
          type: true,
          domain: { select: { name: true } },
          activities: { include: { activity: { select: { name: true } } } },
          publisher: { select: { name: true } },
        },
      },
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
    const description = enrichment.mission?.description ?? "";
    const title = enrichment.mission?.title ?? "";
    const publisherId = enrichment.mission?.publisherId ?? "";

    const base = {
      missionId: enrichment.missionId,
      title,
      description,
      applicationUrl: enrichment.mission?.applicationUrl ?? "",
      backofficUrl: publisherId ? `https://app.api-engagement.beta.gouv.fr/${publisherId}/mission/${enrichment.missionId}` : "",
      publisherName: enrichment.mission?.publisher?.name ?? "",
      missionType: enrichment.mission?.type ?? "",
      domainName: enrichment.mission?.domain?.name ?? "",
      activity: enrichment.mission?.activities.map((a) => a.activity.name).join(", ") ?? "",
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
        taxonomy: v.taxonomyValue!.taxonomy.key,
        taxonomyLabel: v.taxonomyValue!.taxonomy.label,
        value: v.taxonomyValue!.key,
        valueLabel: v.taxonomyValue!.label,
        confidence: String(v.confidence),
        reasoning: evidence?.reasoning ?? "",
      });
    }

    // Skipped classifications from rawResponse
    if (enrichment.rawResponse) {
      try {
        const raw = typeof enrichment.rawResponse === "string" ? enrichment.rawResponse : JSON.stringify(enrichment.rawResponse);
        const parsed = JSON.parse(raw) as { classifications?: unknown[] };
        const classifications = Array.isArray(parsed.classifications) ? parsed.classifications : [];
        const skipped = getSkippedClassifications(classifications as RawClassification[], fullLookup);

        for (const s of skipped) {
          const dimMeta = fullLookup.get(s.taxonomy_key);
          const valMeta = dimMeta?.values.get(s.value_key);
          rows.push({
            ...base,
            status: "skipped",
            skipReason: s.reason,
            taxonomy: s.taxonomy_key,
            taxonomyLabel: dimMeta?.label ?? "",
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
