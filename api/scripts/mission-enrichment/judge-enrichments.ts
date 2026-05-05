import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { pgConnected, pgDisconnect, prisma } from "@/db/postgres";
import { ai } from "@/services/ai";
import { CURRENT_PROMPT_VERSION, LLM_MAX_RETRIES } from "@/services/mission-enrichment/config";
import { buildMissionBlock, buildTaxonomyBlock } from "@/services/mission-enrichment/prompts";
import type { MissionForPrompt, TaxonomyForPrompt } from "@/services/mission-enrichment/prompts/types";
import { buildTaxonomyGuidanceBlock } from "@/services/mission-enrichment/prompts/v2";
import { ENRICHABLE_TAXONOMIES, TAXONOMY } from "@engagement/taxonomy";
import { generateObject } from "ai";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { setTimeout as sleep } from "timers/promises";
import { z } from "zod";

// ─── Config ──────────────────────────────────────────────────────────────────

const JUDGE_MODEL_ID = "gpt-4.1-mini";
const JUDGE_MODEL = ai.model("openai", JUDGE_MODEL_ID);
const DEFAULT_VERSION = CURRENT_PROMPT_VERSION;
const DEFAULT_LIMIT = 100;
const DEFAULT_SLEEP_MS = 500;
const DEFAULT_OUTPUT = "./judge-enrichments.jsonl";
const DEFAULT_REPORT = "./judge-enrichments-report.md";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const parsePositiveInteger = (value: string | undefined, defaultValue: number, name: string): number => {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} doit être un entier positif`);
  return parsed;
};

const version = getArg("--version") ?? DEFAULT_VERSION;
const limit = parsePositiveInteger(getArg("--limit"), DEFAULT_LIMIT, "--limit");
const sleepMs = parsePositiveInteger(getArg("--sleep-ms"), DEFAULT_SLEEP_MS, "--sleep-ms");
const outputPath = getArg("--output") ?? DEFAULT_OUTPUT;
const reportPath = getArg("--report") ?? DEFAULT_REPORT;

// ─── Judge schema ─────────────────────────────────────────────────────────────

const JUDGE_SCHEMA = z.object({
  verdict: z.enum(["approved", "flagged_minor", "flagged_major"]),
  classifications_review: z.array(
    z.object({
      taxonomy_key: z.string(),
      value_key: z.string(),
      status: z.enum(["ok", "questionable", "wrong"]),
      reason: z.string(),
    })
  ),
  missing_values: z
    .array(
      z.object({
        taxonomy_key: z.string(),
        value_key: z.string(),
        reason: z.string(),
      })
    )
    .max(5),
  failure_patterns: z.array(z.string()).max(3),
  summary: z.string(),
});

type JudgeResult = z.infer<typeof JUDGE_SCHEMA>;

// ─── Prompt ──────────────────────────────────────────────────────────────────

const buildJudgeSystemPrompt = (taxonomyBlock: string): string => `\
Tu es un évaluateur expert de classifications de missions d'engagement bénévole et civique.

Ta tâche : évaluer si les classifications produites par un classificateur LLM sont correctes, incorrectes ou manquantes, en te basant exclusivement sur le texte de la mission et les règles ci-dessous.

## Règles de classification à appliquer

Ces règles sont celles utilisées par le classificateur. Applique-les exactement pour évaluer ses résultats.

${buildTaxonomyGuidanceBlock()}

## Taxonomies de référence

${taxonomyBlock}

## Critères d'évaluation

Pour chaque classification existante :
- "ok" : clairement justifiée par le texte de la mission et conforme aux règles
- "questionable" : plausible mais signal ambigu — ne pas forcer un "wrong" si tu n'es pas certain
- "wrong" : incorrecte ou clairement non justifiée par le texte, ou en contradiction avec les règles
- Renseigne toujours "reason" ; utilise une chaîne vide pour les classifications "ok" sans remarque utile

Pour les valeurs manquantes (missing_values) :
- Identifie uniquement les valeurs qui sont manifestement justifiées par le texte mais absentes
- Maximum 5 — ne les surcharge pas si les classifications sont globalement correctes

Verdicts globaux :
- "approved" : les classifications sont globalement correctes, pas de problème majeur
- "flagged_minor" : une ou deux classifications discutables, sans impact sur la compréhension de la mission
- "flagged_major" : erreur significative (mauvais domaine principal, intention erronée) ou plusieurs valeurs fausses

## Principes fondamentaux

- Ancre chaque verdict dans le texte de la mission — ne déduis pas ce qui n'y est pas
- Ne préfère pas une version qui retourne plus de valeurs : la complétude n'est pas une vertu en soi
- Si tu ne peux pas trancher, utilise "questionable" plutôt que "wrong"
- Ignore les confidences (0–1) dans ton évaluation : juge uniquement la pertinence des valeurs choisies
- Pour failure_patterns : liste jusqu'à 3 formulations courtes décrivant le type d'erreur (ex. "domaine trop large", "formation_onisep ignorée", "cadre_engage non justifié")`;

const buildJudgeUserMessage = (
  missionBlock: string,
  classifications: Array<{ taxonomy_key: string; value_key: string; confidence: number; evidence: { extract: string; reasoning: string } }>
): string => {
  const classificationsText =
    classifications.length === 0
      ? "Aucune classification produite."
      : classifications
          .map(
            (c) =>
              `- **${c.taxonomy_key}** → \`${c.value_key}\` (confidence: ${c.confidence.toFixed(2)})\n  Extrait : « ${c.evidence.extract} »\n  Raisonnement : ${c.evidence.reasoning}`
          )
          .join("\n\n");

  return `\
## Mission à évaluer

${missionBlock}

## Classifications à évaluer

${classificationsText}`;
};

// ─── Taxonomy helpers ─────────────────────────────────────────────────────────

type TaxonomyWithValues = { key: string; type: string; label: string; values: Array<{ key: string; label: string }> };

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
  taxonomies.map((t) => ({ key: t.key, label: t.label, type: t.type, values: t.values.map((v) => ({ key: v.key, label: v.label })) }));

// ─── Mission helpers ──────────────────────────────────────────────────────────

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
    activities: mission.activities.map((a) => a.activity.name),
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

// ─── Judge runner ─────────────────────────────────────────────────────────────

type EnrichmentValue = {
  taxonomyKey: string;
  valueKey: string;
  confidence: number;
  evidence: { extract: string; reasoning: string };
};

type JudgeRunResult = {
  enrichmentId: string;
  missionId: string;
  promptVersion: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  result?: JudgeResult;
  error?: { message: string };
};

const runJudge = async (params: {
  enrichmentId: string;
  missionId: string;
  promptVersion: string;
  missionBlock: string;
  taxonomyBlock: string;
  values: EnrichmentValue[];
}): Promise<JudgeRunResult> => {
  const startedAt = performance.now();

  const classifications = params.values.map((v) => ({
    taxonomy_key: v.taxonomyKey,
    value_key: v.valueKey,
    confidence: v.confidence,
    evidence: v.evidence as { extract: string; reasoning: string },
  }));

  try {
    const llmResult = await generateObject({
      model: JUDGE_MODEL,
      schema: JUDGE_SCHEMA,
      system: buildJudgeSystemPrompt(params.taxonomyBlock),
      prompt: buildJudgeUserMessage(params.missionBlock, classifications),
      maxRetries: LLM_MAX_RETRIES,
      temperature: 0,
    });

    return {
      enrichmentId: params.enrichmentId,
      missionId: params.missionId,
      promptVersion: params.promptVersion,
      durationMs: Math.round(performance.now() - startedAt),
      inputTokens: llmResult.usage.inputTokens,
      outputTokens: llmResult.usage.outputTokens,
      totalTokens: llmResult.usage.totalTokens,
      result: llmResult.object,
    };
  } catch (err) {
    const error = err as { message?: string };
    return {
      enrichmentId: params.enrichmentId,
      missionId: params.missionId,
      promptVersion: params.promptVersion,
      durationMs: Math.round(performance.now() - startedAt),
      error: { message: error.message ?? String(err) },
    };
  }
};

// ─── Report generation ────────────────────────────────────────────────────────

const generateReport = (results: JudgeRunResult[], version: string, judgeModel: string): string => {
  const successful = results.filter((r) => r.result);
  const errors = results.filter((r) => r.error);

  if (successful.length === 0) {
    return `# Rapport juge — ${version}\n\nAucun résultat valide.\n`;
  }

  // Verdict counts
  const verdictCounts = { approved: 0, flagged_minor: 0, flagged_major: 0 };
  for (const r of successful) {
    verdictCounts[r.result!.verdict]++;
  }

  // Per-taxonomy stats
  type TaxoStats = { ok: number; questionable: number; wrong: number; total: number };
  const taxoStats = new Map<string, TaxoStats>();
  const missingByTaxo = new Map<string, number>();

  for (const r of successful) {
    for (const cr of r.result!.classifications_review) {
      const stats = taxoStats.get(cr.taxonomy_key) ?? { ok: 0, questionable: 0, wrong: 0, total: 0 };
      stats[cr.status]++;
      stats.total++;
      taxoStats.set(cr.taxonomy_key, stats);
    }
    for (const mv of r.result!.missing_values) {
      missingByTaxo.set(mv.taxonomy_key, (missingByTaxo.get(mv.taxonomy_key) ?? 0) + 1);
    }
  }

  // Failure patterns aggregation
  const patternCounts = new Map<string, number>();
  for (const r of successful) {
    for (const p of r.result!.failure_patterns) {
      patternCounts.set(p, (patternCounts.get(p) ?? 0) + 1);
    }
  }
  const topPatterns = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Most problematic missions
  const flaggedMajor = successful
    .filter((r) => r.result!.verdict === "flagged_major")
    .slice(0, 10)
    .map((r) => ({
      missionId: r.missionId,
      summary: r.result!.summary,
      patterns: r.result!.failure_patterns.join(", "),
    }));

  // Token cost estimate (OpenAI gpt-4.1-mini: $0.40/M input, $1.60/M output)
  const inputTokensTotal = successful.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0);
  const outputTokensTotal = successful.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0);
  const costEur = ((inputTokensTotal * 0.4 + outputTokensTotal * 1.6) / 1_000_000) * 0.93;

  const pct = (n: number, total: number) => (total === 0 ? "–" : `${Math.round((n / total) * 100)}%`);

  const lines: string[] = [
    `# Rapport juge — prompt ${version}`,
    ``,
    `**Juge :** ${judgeModel}  `,
    `**Missions évaluées :** ${successful.length} (${errors.length} erreurs)  `,
    `**Tokens :** ${inputTokensTotal.toLocaleString()} input / ${outputTokensTotal.toLocaleString()} output — coût estimé ~€${costEur.toFixed(2)}`,
    ``,
    `## Vue d'ensemble`,
    ``,
    `| Verdict | Missions | % |`,
    `|---------|----------|---|`,
    `| ✅ approved | ${verdictCounts.approved} | ${pct(verdictCounts.approved, successful.length)} |`,
    `| ⚠️ flagged_minor | ${verdictCounts.flagged_minor} | ${pct(verdictCounts.flagged_minor, successful.length)} |`,
    `| 🔴 flagged_major | ${verdictCounts.flagged_major} | ${pct(verdictCounts.flagged_major, successful.length)} |`,
    ``,
    `## Par taxonomy_key`,
    ``,
    `| taxonomy_key | ok | questionable | wrong | manquantes |`,
    `|---|---|---|---|---|`,
    ...[...taxoStats.entries()].map(([key, s]) => {
      const missing = missingByTaxo.get(key) ?? 0;
      return `| ${key} | ${pct(s.ok, s.total)} | ${pct(s.questionable, s.total)} | ${pct(s.wrong, s.total)} | ${missing} missions |`;
    }),
    ``,
    `## Patterns d'échec les plus fréquents`,
    ``,
    ...(topPatterns.length === 0 ? [`_Aucun pattern identifié._`] : topPatterns.map(([p, count], i) => `${i + 1}. **"${p}"** — ${count} missions`)),
    ``,
    `## Missions flagged_major (top ${flaggedMajor.length})`,
    ``,
    ...(flaggedMajor.length === 0
      ? [`_Aucune mission flagged_major._`]
      : [
          `| missionId | patterns | résumé |`,
          `|---|---|---|`,
          ...flaggedMajor.map((m) => `| ${m.missionId} | ${m.patterns || "–"} | ${m.summary.replace(/\n/g, " ").slice(0, 120)} |`),
        ]),
  ];

  return lines.join("\n") + "\n";
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const ensureParentDir = (filePath: string) => {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
};

async function main() {
  console.log(`[judge-enrichments] version=${version} limit=${limit} output=${outputPath} report=${reportPath} judgeModel=${JUDGE_MODEL_ID}`);

  await pgConnected();

  const taxonomies = getTaxonomies();
  const taxonomyBlock = buildTaxonomyBlock(toTaxonomyForPrompt(taxonomies));

  const enrichments = await prisma.missionEnrichment.findMany({
    where: { status: "completed", promptVersion: version },
    include: {
      values: true,
      mission: { include: missionInclude },
    },
    take: limit,
    orderBy: { completedAt: "desc" },
  });

  if (enrichments.length === 0) {
    console.warn(`[judge-enrichments] aucun enrichissement trouvé pour version=${version}`);
    await pgDisconnect();
    return;
  }

  console.log(`[judge-enrichments] ${enrichments.length} enrichissements chargés`);

  ensureParentDir(outputPath);
  ensureParentDir(reportPath);
  fs.writeFileSync(outputPath, "", "utf-8");

  const results: JudgeRunResult[] = [];

  for (const enrichment of enrichments) {
    const mission = enrichment.mission;

    if (!mission || mission.deletedAt) {
      console.warn(`[judge-enrichments] mission introuvable ou supprimée pour enrichmentId=${enrichment.id}`);
      continue;
    }

    const missionBlock = buildMissionBlock(toMissionForPrompt(mission as MissionWithRelations));

    const values: EnrichmentValue[] = enrichment.values
      .filter((v) => v.taxonomyKey !== null && v.valueKey !== null)
      .map((v) => ({
        taxonomyKey: v.taxonomyKey!,
        valueKey: v.valueKey!,
        confidence: v.confidence,
        evidence: v.evidence as { extract: string; reasoning: string },
      }));

    console.log(`[judge-enrichments] missionId=${mission.id} enrichmentId=${enrichment.id} values=${values.length}`);

    const runResult = await runJudge({
      enrichmentId: enrichment.id,
      missionId: mission.id,
      promptVersion: version,
      missionBlock,
      taxonomyBlock,
      values,
    });

    results.push(runResult);
    fs.appendFileSync(outputPath, `${JSON.stringify(runResult)}\n`, "utf-8");

    if (runResult.error) {
      console.error(`[judge-enrichments] error enrichmentId=${enrichment.id}: ${runResult.error.message}`);
    } else {
      console.log(
        `[judge-enrichments] ok enrichmentId=${enrichment.id} verdict=${runResult.result!.verdict} duration=${runResult.durationMs}ms tokens=${runResult.totalTokens ?? "n/a"}`
      );
    }

    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }

  const report = generateReport(results, version, JUDGE_MODEL_ID);
  fs.writeFileSync(reportPath, report, "utf-8");

  const successful = results.filter((r) => r.result);
  const errors = results.filter((r) => r.error);
  console.log(`[judge-enrichments] terminé — ${successful.length} succès / ${errors.length} erreurs — détails: ${outputPath}, rapport: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("[judge-enrichments] échec", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgDisconnect();
  });
