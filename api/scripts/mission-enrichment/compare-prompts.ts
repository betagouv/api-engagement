import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { pgConnected, pgDisconnect, prisma } from "@/db/postgres";
import { CONFIDENCE_THRESHOLD, LLM_MAX_RETRIES } from "@/services/mission-enrichment/config";
import { validateEnrichmentClassifications, type ClassificationInput, type ParsedClassification, type SkippedClassification, type TaxonomyLookup } from "@/services/mission-enrichment/parser";
import { buildMissionBlock, buildTaxonomyBlock, PROMPT_REGISTRY } from "@/services/mission-enrichment/prompts";
import type { MissionForPrompt, TaxonomyForPrompt } from "@/services/mission-enrichment/prompts/types";
import { ENRICHABLE_TAXONOMIES, TAXONOMY } from "@engagement/taxonomy";
import { generateObject } from "ai";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { setTimeout as sleep } from "timers/promises";

const DEFAULT_VERSIONS = ["v2", "v3"];
const DEFAULT_RUNS = 5;
const DEFAULT_SLEEP_MS = 500;
const DEFAULT_OUTPUT = "./compare-prompts.jsonl";
const DEFAULT_SUMMARY = "./compare-prompts-summary.csv";
const DEFAULT_RANDOM_MISSION_COUNT = 5;

type TaxonomyWithValues = { key: string; type: string; label: string; values: Array<{ key: string; label: string }> };

type RunResult = {
  missionId: string;
  promptVersion: string;
  runIndex: number;
  orderIndex: number;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  rawResponse?: unknown;
  valid: ParsedClassification[];
  skipped: SkippedClassification[];
  error?: { name?: string; message: string; statusCode?: number; responseBody?: string };
};

type VersionSummary = {
  missionId: string;
  promptVersion: string;
  runs: RunResult[];
  successfulRuns: RunResult[];
  errorRate: number;
  consensus: Map<string, { count: number; confidenceAvg: number }>;
  stability: number;
};

type CliOptions = {
  ids: string[];
  versions: string[];
  runs: number;
  output: string;
  summary: string;
  sleepMs: number;
};

const args = process.argv.slice(2);

const getArg = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
};

const csvEscape = (value: string | number | undefined): string => {
  const str = String(value ?? "").replace(/\n/g, " ").replace(/\r/g, "");
  return `"${str.replace(/"/g, '""')}"`;
};

const parsePositiveInteger = (value: string | undefined, defaultValue: number, name: string): number => {
  if (!value) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} doit être un entier positif`);
  }
  return parsed;
};

const parseIds = (): string[] => {
  const idsArg = getArg("--ids");
  const idsFile = getArg("--ids-file");

  const ids = [
    ...(idsArg ? idsArg.split(",") : []),
    ...(idsFile
      ? fs
          .readFileSync(idsFile, "utf-8")
          .split(/\r?\n|,/)
      : []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  return [...new Set(ids)];
};

const parseOptions = (): CliOptions => {
  const ids = parseIds();

  const versions = (getArg("--versions") ?? DEFAULT_VERSIONS.join(","))
    .split(",")
    .map((version) => version.trim())
    .filter(Boolean);

  if (versions.length < 2) {
    throw new Error("--versions doit contenir au moins deux versions");
  }

  const unknownVersions = versions.filter((version) => !PROMPT_REGISTRY[version]);
  if (unknownVersions.length > 0) {
    throw new Error(`Versions inconnues: ${unknownVersions.join(", ")}. Versions disponibles: ${Object.keys(PROMPT_REGISTRY).join(", ")}`);
  }

  return {
    ids,
    versions,
    runs: parsePositiveInteger(getArg("--runs"), DEFAULT_RUNS, "--runs"),
    output: getArg("--output") ?? DEFAULT_OUTPUT,
    summary: getArg("--summary") ?? DEFAULT_SUMMARY,
    sleepMs: parsePositiveInteger(getArg("--sleep-ms"), DEFAULT_SLEEP_MS, "--sleep-ms"),
  };
};

const buildTaxonomyLookup = (taxonomies: TaxonomyWithValues[]): TaxonomyLookup => {
  const lookup: TaxonomyLookup = new Map();
  for (const taxonomy of taxonomies) {
    lookup.set(taxonomy.key, { type: taxonomy.type, values: new Set(taxonomy.values.map((value) => value.key)) });
  }
  return lookup;
};

const getTaxonomies = (): TaxonomyWithValues[] =>
  ENRICHABLE_TAXONOMIES.map((taxonomyKey) => ({
    key: taxonomyKey,
    label: TAXONOMY[taxonomyKey].label,
    type: TAXONOMY[taxonomyKey].type,
    values: Object.entries(TAXONOMY[taxonomyKey].values)
      .filter(([, value]) => value.enrichable)
      .map(([valueKey, value]) => ({ key: valueKey, label: value.label })),
  }));

const toTaxonomyForPrompt = (taxonomies: TaxonomyWithValues[]): TaxonomyForPrompt =>
  taxonomies.map((taxonomy) => ({
    key: taxonomy.key,
    label: taxonomy.label,
    type: taxonomy.type,
    values: taxonomy.values.map((value) => ({ key: value.key, label: value.label })),
  }));

const missionInclude = {
  domain: { select: { name: true } },
  activities: { include: { activity: { select: { name: true } } } },
  publisherOrganization: {
    include: {
      organizationVerified: {
        select: { object: true, socialObject1: true, socialObject2: true },
      },
    },
  },
} satisfies Prisma.MissionInclude;

type MissionWithRelations = Prisma.MissionGetPayload<{ include: typeof missionInclude }>;

const toMissionForPrompt = (mission: MissionWithRelations): MissionForPrompt => {
  const org = mission.publisherOrganization;
  const verifiedOrg = org?.organizationVerified;

  return {
    title: mission.title,
    description: mission.description,
    tasks: mission.tasks,
    audience: mission.audience,
    softSkills: mission.softSkills,
    requirements: mission.requirements,
    tags: mission.tags,
    type: mission.type,
    remote: mission.remote,
    openToMinors: mission.openToMinors,
    reducedMobilityAccessible: mission.reducedMobilityAccessible,
    duration: mission.duration,
    startAt: mission.startAt,
    endAt: mission.endAt,
    schedule: mission.schedule,
    domainName: mission.domain?.name ?? null,
    activities: mission.activities.map((activity) => activity.activity.name),
    organizationName: org?.name ?? null,
    organizationType: org?.type ?? null,
    organizationDescription: org?.description ?? null,
    organizationActions: org?.actions ?? [],
    organizationBeneficiaries: org?.beneficiaries ?? [],
    organizationParentOrganizations: org?.parentOrganizations ?? [],
    organizationObject: verifiedOrg?.object ?? null,
    organizationSocialObject1: verifiedOrg?.socialObject1 ?? null,
    organizationSocialObject2: verifiedOrg?.socialObject2 ?? null,
  };
};

const classificationKey = (classification: Pick<ClassificationInput, "taxonomy_key" | "value_key">): string => `${classification.taxonomy_key}.${classification.value_key}`;

const getErrorPayload = (error: unknown): RunResult["error"] => {
  const err = error as { name?: string; message?: string; statusCode?: number; responseBody?: string };
  return {
    name: err.name,
    message: err.message ?? String(error),
    statusCode: err.statusCode,
    responseBody: err.responseBody,
  };
};

const rotateVersions = (versions: string[], runIndex: number): string[] => {
  const shift = runIndex % versions.length;
  return [...versions.slice(shift), ...versions.slice(0, shift)];
};

const runPrompt = async (params: {
  missionId: string;
  version: string;
  runIndex: number;
  orderIndex: number;
  missionBlock: string;
  taxonomyBlock: string;
  taxonomyLookup: TaxonomyLookup;
}): Promise<RunResult> => {
  const promptVersion = PROMPT_REGISTRY[params.version];
  const startedAt = performance.now();

  try {
    const llmResult = await generateObject({
      model: promptVersion.MODEL,
      schema: promptVersion.ENRICHMENT_SCHEMA,
      system: promptVersion.buildSystemPrompt(params.taxonomyBlock),
      prompt: promptVersion.buildUserMessage(params.missionBlock),
      maxRetries: LLM_MAX_RETRIES,
      temperature: promptVersion.TEMPERATURE,
    });

    const durationMs = Math.round(performance.now() - startedAt);
    const classifications = (llmResult.object as { classifications: ClassificationInput[] }).classifications;
    const { valid, skipped } = validateEnrichmentClassifications(classifications, params.taxonomyLookup, CONFIDENCE_THRESHOLD);

    return {
      missionId: params.missionId,
      promptVersion: params.version,
      runIndex: params.runIndex,
      orderIndex: params.orderIndex,
      durationMs,
      inputTokens: llmResult.usage.inputTokens,
      outputTokens: llmResult.usage.outputTokens,
      totalTokens: llmResult.usage.totalTokens,
      rawResponse: llmResult.object,
      valid,
      skipped,
    };
  } catch (error) {
    return {
      missionId: params.missionId,
      promptVersion: params.version,
      runIndex: params.runIndex,
      orderIndex: params.orderIndex,
      durationMs: Math.round(performance.now() - startedAt),
      valid: [],
      skipped: [],
      error: getErrorPayload(error),
    };
  }
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const average = (values: number[]): number => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 && right.size === 0) {
    return 1;
  }
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
};

const summarizeVersion = (missionId: string, promptVersion: string, runs: RunResult[], expectedRuns: number): VersionSummary => {
  const successfulRuns = runs.filter((run) => !run.error);
  const threshold = Math.ceil(expectedRuns / 2);
  const counts = new Map<string, { count: number; confidences: number[] }>();

  for (const run of successfulRuns) {
    const seenInRun = new Set<string>();
    for (const classification of run.valid) {
      const key = classificationKey(classification);
      if (seenInRun.has(key)) {
        continue;
      }
      seenInRun.add(key);
      const existing = counts.get(key) ?? { count: 0, confidences: [] };
      existing.count += 1;
      existing.confidences.push(classification.confidence);
      counts.set(key, existing);
    }
  }

  const consensus = new Map<string, { count: number; confidenceAvg: number }>();
  for (const [key, value] of counts) {
    if (value.count >= threshold) {
      consensus.set(key, { count: value.count, confidenceAvg: average(value.confidences) });
    }
  }

  const runSets = successfulRuns.map((run) => new Set(run.valid.map(classificationKey)));
  const stabilityPairs: number[] = [];
  for (let i = 0; i < runSets.length; i++) {
    for (let j = i + 1; j < runSets.length; j++) {
      stabilityPairs.push(jaccard(runSets[i], runSets[j]));
    }
  }

  return {
    missionId,
    promptVersion,
    runs,
    successfulRuns,
    errorRate: runs.length ? (runs.length - successfulRuns.length) / runs.length : 0,
    consensus,
    stability: stabilityPairs.length ? average(stabilityPairs) : successfulRuns.length === 1 ? 1 : 0,
  };
};

const summarizeAll = (results: RunResult[], options: CliOptions): string[] => {
  const rows = [
    [
      "scope",
      "missionId",
      "baselineVersion",
      "promptVersion",
      "runs",
      "successfulRuns",
      "errorRate",
      "latencyP50Ms",
      "latencyP90Ms",
      "latencyP95Ms",
      "inputTokensAvg",
      "outputTokensAvg",
      "totalTokensAvg",
      "totalTokensP95",
      "stability",
      "baselineJaccard",
      "commonValues",
      "addedValues",
      "removedValues",
      "avgConfidenceDelta",
      "divergenceStrong",
      "divergenceWeak",
    ].join(","),
  ];

  const baselineVersion = options.versions[0];

  for (const missionId of options.ids) {
    const summaries = new Map(
      options.versions.map((version) => [
        version,
        summarizeVersion(
          missionId,
          version,
          results.filter((result) => result.missionId === missionId && result.promptVersion === version),
          options.runs
        ),
      ])
    );
    const baseline = summaries.get(baselineVersion)!;
    const baselineConsensus = new Set(baseline.consensus.keys());

    for (const version of options.versions) {
      const summary = summaries.get(version)!;
      const latencies = summary.successfulRuns.map((run) => run.durationMs);
      const inputTokens = summary.successfulRuns.map((run) => run.inputTokens ?? 0);
      const outputTokens = summary.successfulRuns.map((run) => run.outputTokens ?? 0);
      const totalTokens = summary.successfulRuns.map((run) => run.totalTokens ?? 0);
      const consensus = new Set(summary.consensus.keys());
      const commonValues = [...consensus].filter((value) => baselineConsensus.has(value));
      const addedValues = [...consensus].filter((value) => !baselineConsensus.has(value));
      const removedValues = [...baselineConsensus].filter((value) => !consensus.has(value));
      const confidenceDeltas = commonValues.map((value) => (summary.consensus.get(value)?.confidenceAvg ?? 0) - (baseline.consensus.get(value)?.confidenceAvg ?? 0));
      const strongDivergences = version === baselineVersion ? 0 : addedValues.length + removedValues.length;
      const weakDivergences =
        version === baselineVersion
          ? 0
          : summary.successfulRuns
              .flatMap((run) => run.valid.map(classificationKey))
              .filter((value) => !consensus.has(value) && !baselineConsensus.has(value)).length;

      rows.push(
        [
          "mission",
          missionId,
          baselineVersion,
          version,
          options.runs,
          summary.successfulRuns.length,
          summary.errorRate.toFixed(4),
          Math.round(percentile(latencies, 50)),
          Math.round(percentile(latencies, 90)),
          Math.round(percentile(latencies, 95)),
          average(inputTokens).toFixed(2),
          average(outputTokens).toFixed(2),
          average(totalTokens).toFixed(2),
          Math.round(percentile(totalTokens, 95)),
          summary.stability.toFixed(4),
          jaccard(baselineConsensus, consensus).toFixed(4),
          commonValues.join("|"),
          addedValues.join("|"),
          removedValues.join("|"),
          average(confidenceDeltas).toFixed(4),
          strongDivergences,
          weakDivergences,
        ].map(csvEscape).join(",")
      );
    }
  }

  for (const version of options.versions) {
    const versionResults = results.filter((result) => result.promptVersion === version);
    const successfulRuns = versionResults.filter((result) => !result.error);
    const latencies = successfulRuns.map((run) => run.durationMs);
    const inputTokens = successfulRuns.map((run) => run.inputTokens ?? 0);
    const outputTokens = successfulRuns.map((run) => run.outputTokens ?? 0);
    const totalTokens = successfulRuns.map((run) => run.totalTokens ?? 0);

    rows.push(
      [
        "global",
        "",
        baselineVersion,
        version,
        versionResults.length,
        successfulRuns.length,
        versionResults.length ? ((versionResults.length - successfulRuns.length) / versionResults.length).toFixed(4) : "0",
        Math.round(percentile(latencies, 50)),
        Math.round(percentile(latencies, 90)),
        Math.round(percentile(latencies, 95)),
        average(inputTokens).toFixed(2),
        average(outputTokens).toFixed(2),
        average(totalTokens).toFixed(2),
        Math.round(percentile(totalTokens, 95)),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ].map(csvEscape).join(",")
    );
  }

  return rows;
};

const ensureParentDir = (filePath: string) => {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
};

const resolveMissionIds = async (ids: string[]): Promise<string[]> => {
  if (ids.length > 0) {
    return ids;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM mission
      WHERE deleted_at IS NULL
      ORDER BY RANDOM()
      LIMIT ${DEFAULT_RANDOM_MISSION_COUNT}
    `
  );

  return rows.map((row) => row.id);
};

async function main() {
  const options = parseOptions();
  const taxonomies = getTaxonomies();
  const taxonomyBlock = buildTaxonomyBlock(toTaxonomyForPrompt(taxonomies));
  const taxonomyLookup = buildTaxonomyLookup(taxonomies);

  ensureParentDir(options.output);
  ensureParentDir(options.summary);
  fs.writeFileSync(options.output, "", "utf-8");

  console.log(
    `[compare-prompts] missions=${options.ids.length} versions=${options.versions.join(",")} runs=${options.runs} output=${options.output} summary=${options.summary}`
  );

  await pgConnected();

  options.ids = await resolveMissionIds(options.ids);
  if (options.ids.length === 0) {
    throw new Error("Aucune mission éligible trouvée");
  }
  console.log(`[compare-prompts] ids=${options.ids.join(",")}`);

  const missions = await prisma.mission.findMany({
    where: { id: { in: options.ids }, deletedAt: null },
    include: missionInclude,
  });
  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));
  const missingIds = options.ids.filter((id) => !missionsById.has(id));
  if (missingIds.length > 0) {
    console.warn(`[compare-prompts] missions introuvables ou supprimées: ${missingIds.join(", ")}`);
  }

  const results: RunResult[] = [];

  for (const missionId of options.ids) {
    const mission = missionsById.get(missionId);
    if (!mission) {
      continue;
    }

    const missionBlock = buildMissionBlock(toMissionForPrompt(mission));
    for (let runIndex = 0; runIndex < options.runs; runIndex++) {
      const versionsForRun = rotateVersions(options.versions, runIndex);
      for (let orderIndex = 0; orderIndex < versionsForRun.length; orderIndex++) {
        const version = versionsForRun[orderIndex];
        console.log(`[compare-prompts] mission=${missionId} run=${runIndex + 1}/${options.runs} version=${version}`);
        const result = await runPrompt({ missionId, version, runIndex, orderIndex, missionBlock, taxonomyBlock, taxonomyLookup });
        results.push(result);
        fs.appendFileSync(options.output, `${JSON.stringify(result)}\n`, "utf-8");

        if (result.error) {
          console.error(`[compare-prompts] error mission=${missionId} version=${version}: ${result.error.message}`);
        } else {
          console.log(
            `[compare-prompts] ok mission=${missionId} version=${version} duration=${result.durationMs}ms tokens=${result.totalTokens ?? "n/a"} valid=${result.valid.length} skipped=${result.skipped.length}`
          );
        }

        if (options.sleepMs > 0) {
          await sleep(options.sleepMs);
        }
      }
    }
  }

  fs.writeFileSync(options.summary, `${summarizeAll(results, options).join("\n")}\n`, "utf-8");
  console.log(`[compare-prompts] terminé — détails: ${options.output}, synthèse: ${options.summary}`);
}

main()
  .catch((error) => {
    console.error("[compare-prompts] échec", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgDisconnect();
  });
