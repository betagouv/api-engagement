import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { pgConnected, pgDisconnect, prisma } from "@/db/postgres";
import { ai } from "@/services/ai";
import { LLM_MAX_RETRIES } from "@/services/mission-enrichment/config";
import type { PromptVersion } from "@/services/mission-enrichment/prompts";
import { buildMissionBlock, buildTaxonomyBlock, CURRENT_PROMPT_VERSION, PROMPT_REGISTRY } from "@/services/mission-enrichment/prompts";
import type { MissionForPrompt, TaxonomyForPrompt } from "@/services/mission-enrichment/prompts/types";
import { buildTaxonomyGuidanceBlock as renderTaxonomyGuidanceBlock, TAXONOMY_GUIDANCE_MAP } from "@/services/mission-enrichment/prompts/v2";
import { buildTaxonomyGuidanceBlock as buildTaxonomyGuidanceBlockV3 } from "@/services/mission-enrichment/prompts/v3";
import { TAXONOMY_GUIDANCE_MAP_V5 } from "@/services/mission-enrichment/prompts/v5";
import { resolveRomeSkills } from "@/utils/rome";
import type { EnrichableTaxonomyKey } from "@engagement/taxonomy";
import { TAXONOMY } from "@engagement/taxonomy";
import { generateObject } from "ai";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { setTimeout as sleep } from "timers/promises";
import { z } from "zod";

const GUIDANCE_BLOCKS: Record<PromptVersion, () => string> = {
  v1: () => "Aucune guidance additionnelle versionnée pour v1.",
  v2: () => renderTaxonomyGuidanceBlock(TAXONOMY_GUIDANCE_MAP),
  v3: buildTaxonomyGuidanceBlockV3,
  v4: buildTaxonomyGuidanceBlockV3,
  v5: () => renderTaxonomyGuidanceBlock(TAXONOMY_GUIDANCE_MAP_V5),
};
const buildTaxonomyGuidanceBlock = (evaluatedVersion: PromptVersion): string => GUIDANCE_BLOCKS[evaluatedVersion]();

// ─── Config ──────────────────────────────────────────────────────────────────

const JUDGE_MODEL_ID = "gpt-4.1-mini";
const JUDGE_MODEL = ai.model("openai", JUDGE_MODEL_ID);
const DEFAULT_VERSION = CURRENT_PROMPT_VERSION;
const DEFAULT_LIMIT = 100;
const DEFAULT_SLEEP_MS = 500;
const DEFAULT_OUTPUT = "./judge-enrichments.csv";
const DEFAULT_REPORT = "./judge-enrichments-report.md";
const DEFAULT_DATASET_OUTPUT = "./enrichment-export.csv";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
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
const parseNonNegativeInteger = (value: string | undefined, defaultValue: number, name: string): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} doit être un entier positif ou nul`);
  }
  return parsed;
};

const version = getArg("--version") ?? DEFAULT_VERSION;
const limit = parsePositiveInteger(getArg("--limit"), DEFAULT_LIMIT, "--limit");
const sleepMs = parseNonNegativeInteger(getArg("--sleep-ms"), DEFAULT_SLEEP_MS, "--sleep-ms");
const outputPath = getArg("--output") ?? DEFAULT_OUTPUT;
const reportPath = getArg("--report") ?? DEFAULT_REPORT;
const datasetOutputPath = getArg("--dataset-output") ?? DEFAULT_DATASET_OUTPUT;
const shouldExportDataset = !args.includes("--skip-dataset-export");
const parseIds = (idsFlag: string, idsFileFlag: string): string[] => {
  const idsArg = getArg(idsFlag);
  const idsFile = getArg(idsFileFlag);
  const ids = [...(idsArg ? idsArg.split(",") : []), ...(idsFile ? fs.readFileSync(idsFile, "utf-8").split(/\r?\n|,/) : [])].map((id) => id.trim()).filter(Boolean);
  return [...new Set(ids)];
};
const missionIds = parseIds("--mission-ids", "--mission-ids-file");

// ─── CSV helpers ─────────────────────────────────────────────────────────────

const csvEscape = (value: string | number | null | undefined): string => {
  const str = String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
  return `"${str.replace(/"/g, '""')}"`;
};

const CSV_HEADERS = [
  "enrichmentId",
  "missionId",
  "promptVersion",
  "durationMs",
  "inputTokens",
  "outputTokens",
  "totalTokens",
  "verdict",
  "summary",
  "classificationsReview",
  "missingValues",
  "failurePatterns",
  "errorMessage",
];

// ─── Judge schema ─────────────────────────────────────────────────────────────

const JUDGE_SCHEMA = z.object({
  verdict: z.enum(["approved", "flagged_minor", "flagged_major"]),
  primary_domain_error: z.boolean(),
  classifications_review: z.array(
    z.object({
      taxonomy_key: z.string(),
      value_key: z.string(),
      status: z.enum(["ok", "questionable", "wrong"]),
      expected_confidence_min: z.number().min(0).max(1),
      expected_confidence_max: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
  missing_values: z
    .array(
      z.object({
        taxonomy_key: z.string(),
        value_key: z.string(),
        confidence: z.number().min(0.8).max(1),
        evidence_extract: z.string().min(1),
        reason: z.string(),
      })
    )
    .max(5),
  failure_patterns: z.array(z.string()).max(3),
  summary: z.string(),
});

type JudgeOutput = z.infer<typeof JUDGE_SCHEMA>;
type ConfidenceStatus = "ok" | "too_low" | "too_high";
type JudgeResult = Omit<JudgeOutput, "classifications_review"> & {
  classifications_review: Array<JudgeOutput["classifications_review"][number] & { confidence: number; confidence_status: ConfidenceStatus }>;
};

const enforceVerdictInvariants = (result: JudgeResult): JudgeResult => {
  const wrongCount = result.classifications_review.filter((c) => c.status === "wrong").length;
  const hasSemanticIssue = wrongCount > 0 || result.missing_values.length > 0;
  const verdict = result.primary_domain_error || wrongCount >= 4 ? "flagged_major" : hasSemanticIssue ? "flagged_minor" : "approved";

  return verdict === result.verdict ? result : { ...result, verdict };
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

const buildJudgeSystemPrompt = (taxonomyBlock: string, taxonomyKeys: readonly EnrichableTaxonomyKey[], evaluatedVersion: PromptVersion): string => {
  const primaryDomainTaxonomy = taxonomyKeys.includes("domaine_engagement") ? "domaine_engagement" : taxonomyKeys.includes("domaine") ? "domaine" : null;
  const internationalRule = taxonomyKeys.includes("region_internationale")
    ? '- Si `region_internationale` est attribué à une mission se déroulant à Mayotte, en Martinique, en Guadeloupe, en Guyane ou à La Réunion, le statut doit être "wrong". Ces territoires sont administrativement France et ne constituent pas une mission internationale.'
    : "- Aucune règle spécifique additionnelle pour les taxonomies de cette version.";
  const primaryDomainMajorRule = primaryDomainTaxonomy ? `la taxonomy \`${primaryDomainTaxonomy}\` principale est incorrecte, OU ` : "";

  return `\
Tu es un évaluateur expert de classifications de missions d'engagement bénévole et civique.

Ta tâche : évaluer si les classifications produites par un classificateur LLM sont correctes, incorrectes ou manquantes, en te basant exclusivement sur le texte de la mission et les règles ci-dessous.

## Règles de classification à appliquer

Ces règles sont celles utilisées par le classificateur. Applique-les exactement pour évaluer ses résultats.

${buildTaxonomyGuidanceBlock(evaluatedVersion)}

## Taxonomies de référence

${taxonomyBlock}

## Critères d'évaluation

Pour chaque classification existante :
- "ok" : clairement justifiée par le texte de la mission et conforme aux règles
- "questionable" : plausible mais signal ambigu — ne pas forcer un "wrong" si tu n'es pas certain
- "wrong" : incorrecte ou clairement non justifiée par le texte, ou en contradiction avec les règles
- Évalue séparément la calibration de sa confiance avec "expected_confidence_min" et "expected_confidence_max". Donne la plage raisonnable pour cette classification, avec min ≤ max. Le script comparera lui-même la confiance observée à cette plage.
- Utilise l'échelle du classificateur : 0.90–1.00 explicite, 0.70–0.89 clair, 0.50–0.69 inférence plausible, 0.30–0.49 signal faible avec plusieurs indices convergents
- Le statut sémantique et la calibration sont indépendants : une valeur peut être "questionable" avec une confiance faible correctement calibrée.
- Renseigne toujours "reason" ; utilise une chaîne vide uniquement lorsque le statut est "ok" et que la confiance observée appartient à la plage attendue.

Pour les valeurs manquantes (missing_values) :
- Identifie uniquement les valeurs qui sont manifestement justifiées par le texte mais absentes
- Chaque entrée signifie strictement « cette valeur aurait dû être ajoutée ». N'utilise jamais missing_values pour commenter une valeur qui doit rester absente, qui serait incorrecte ou pour laquelle le référentiel ne possède pas de bonne approximation.
- Fournis dans "evidence_extract" un extrait LITTÉRAL du bloc mission qui établit directement la valeur manquante. N'utilise ni reformulation, ni raisonnement, ni extrait issu des classifications proposées.
- N'ajoute une valeur manquante que si sa confiance est comprise entre 0.80 et 1.00. En cas d'ambiguïté, n'ajoute rien.
- Utilise exclusivement les taxonomy_key et value_key présents dans les taxonomies de référence. N'invente jamais une valeur pour mieux représenter la mission.
- Respecte les unités et périodicités littérales. Ne transforme notamment pas une fréquence mensuelle en moyenne hebdomadaire.
- Maximum 5 — ne les surcharge pas si les classifications sont globalement correctes

Pour "primary_domain_error" :
- Utilise la taxonomy \`${primaryDomainTaxonomy ?? "aucune"}\`.
- Retourne true uniquement si le domaine réellement principal est absent ou si la valeur de domaine la mieux scorée est incorrecte.
- Une valeur de domaine secondaire incorrecte ne constitue PAS une erreur de domaine principal lorsqu'une valeur mieux scorée ou aussi bien scorée décrit correctement le domaine principal.

Verdicts globaux :
- "approved" : aucun tag incorrect et aucune valeur manifestement manquante ; des confiances imparfaites restent un diagnostic séparé
- "flagged_minor" : 1 à 3 tags wrong sur des dimensions secondaires, ou au moins une valeur manifestement manquante
- "flagged_major" : ${primaryDomainMajorRule}4 tags ou plus sont classés wrong dans classifications_review

Les problèmes de calibration de confiance ne modifient jamais, à eux seuls, le verdict sémantique.

## Règles spécifiques par taxonomy

${internationalRule}

## Principes fondamentaux

- Ancre chaque verdict dans le texte de la mission — ne déduis pas ce qui n'y est pas
- Ne préfère pas une version qui retourne plus de valeurs : la complétude n'est pas une vertu en soi
- Si tu ne peux pas trancher, utilise "questionable" plutôt que "wrong"
- Pour failure_patterns : liste jusqu'à 3 formulations courtes décrivant uniquement les erreurs sémantiques (ex. "domaine trop large", "signal explicite ignoré", "rythme mensuel interprété comme hebdomadaire"). N'y inclus pas les seuls écarts de confiance.`;
};

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

// Le juge doit voir exactement le référentiel que la version évaluée était censée produire.
// On part donc de la whitelist explicite du prompt (`TAXONOMY_KEYS`), pas du référentiel global
// `ENRICHABLE_TAXONOMIES` : sinon les taxonomies enrichissables ajoutées pour des versions
// ultérieures seraient signalées comme « manquantes » et pénaliseraient injustement v1-v4.
const resolveEvaluatedPromptVersion = (evaluatedVersion: string): PromptVersion => {
  if (Object.prototype.hasOwnProperty.call(PROMPT_REGISTRY, evaluatedVersion)) {
    return evaluatedVersion as PromptVersion;
  }
  throw new Error(`[judge-enrichments] version inconnue "${evaluatedVersion}" — aucune whitelist de taxonomies disponible`);
};

const resolveEvaluatedTaxonomyKeys = (evaluatedVersion: PromptVersion): readonly EnrichableTaxonomyKey[] => PROMPT_REGISTRY[evaluatedVersion].TAXONOMY_KEYS;

const getTaxonomies = (taxonomyKeys: readonly EnrichableTaxonomyKey[]): TaxonomyWithValues[] =>
  taxonomyKeys.map((taxonomyKey) => ({
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
    romeSkillLabels: resolveRomeSkills(mission.romeSkills),
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

const normalizeJudgeOutput = (
  output: JudgeOutput,
  values: EnrichmentValue[],
  taxonomyKeys: readonly EnrichableTaxonomyKey[],
  primaryDomainTaxonomy: string | null,
  missionBlock: string
): JudgeResult => {
  const allowedKeys = new Set<string>();
  for (const taxonomyKey of taxonomyKeys) {
    for (const [valueKey, value] of Object.entries(TAXONOMY[taxonomyKey].values)) {
      if (value.enrichable) {
        allowedKeys.add(`${taxonomyKey}.${valueKey}`);
      }
    }
  }

  const valuesByKey = new Map(values.map((value) => [`${value.taxonomyKey}.${value.valueKey}`, value]));
  const classificationsReview = output.classifications_review.flatMap((review) => {
    const key = `${review.taxonomy_key}.${review.value_key}`;
    const value = valuesByKey.get(key);
    if (!value || !allowedKeys.has(key)) {
      return [];
    }

    const expectedMin = Math.min(review.expected_confidence_min, review.expected_confidence_max);
    const expectedMax = Math.max(review.expected_confidence_min, review.expected_confidence_max);
    const confidenceStatus: ConfidenceStatus = value.confidence < expectedMin ? "too_low" : value.confidence > expectedMax ? "too_high" : "ok";

    return [
      {
        ...review,
        expected_confidence_min: expectedMin,
        expected_confidence_max: expectedMax,
        confidence: value.confidence,
        confidence_status: confidenceStatus,
      },
    ];
  });

  const seenMissingKeys = new Set<string>();
  const normalizedMissionBlock = missionBlock.normalize("NFKC").toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
  const missingValues = output.missing_values.filter((missing) => {
    const key = `${missing.taxonomy_key}.${missing.value_key}`;
    const normalizedExtract = missing.evidence_extract.normalize("NFKC").toLocaleLowerCase("fr-FR").replace(/\s+/g, " ").trim();
    if (!allowedKeys.has(key) || valuesByKey.has(key) || seenMissingKeys.has(key) || normalizedExtract.length === 0 || !normalizedMissionBlock.includes(normalizedExtract)) {
      return false;
    }
    seenMissingKeys.add(key);
    return true;
  });

  const domainReviews = primaryDomainTaxonomy ? classificationsReview.filter((review) => review.taxonomy_key === primaryDomainTaxonomy) : [];
  const bestCorrectDomainConfidence = Math.max(0, ...domainReviews.filter((review) => review.status !== "wrong").map((review) => review.confidence));
  const bestWrongDomainConfidence = Math.max(0, ...domainReviews.filter((review) => review.status === "wrong").map((review) => review.confidence));
  const hasMissingDomain = primaryDomainTaxonomy !== null && missingValues.some((missing) => missing.taxonomy_key === primaryDomainTaxonomy);
  const primaryDomainError = bestWrongDomainConfidence > bestCorrectDomainConfidence || (output.primary_domain_error && hasMissingDomain);

  return enforceVerdictInvariants({
    ...output,
    primary_domain_error: primaryDomainError,
    classifications_review: classificationsReview,
    missing_values: missingValues,
  });
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

const resultToCsv = (result: JudgeRunResult): string =>
  [
    result.enrichmentId,
    result.missionId,
    result.promptVersion,
    result.durationMs,
    result.inputTokens,
    result.outputTokens,
    result.totalTokens,
    result.result?.verdict,
    result.result?.summary,
    result.result ? JSON.stringify(result.result.classifications_review) : "",
    result.result ? JSON.stringify(result.result.missing_values) : "",
    result.result ? JSON.stringify(result.result.failure_patterns) : "",
    result.error?.message,
  ]
    .map(csvEscape)
    .join(",");

const runJudge = async (params: {
  enrichmentId: string;
  missionId: string;
  promptVersion: PromptVersion;
  taxonomyKeys: readonly EnrichableTaxonomyKey[];
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
    const primaryDomainTaxonomy = params.taxonomyKeys.includes("domaine_engagement") ? "domaine_engagement" : params.taxonomyKeys.includes("domaine") ? "domaine" : null;
    const llmResult = await generateObject({
      model: JUDGE_MODEL,
      schema: JUDGE_SCHEMA,
      system: buildJudgeSystemPrompt(params.taxonomyBlock, params.taxonomyKeys, params.promptVersion),
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
      result: normalizeJudgeOutput(llmResult.object, params.values, params.taxonomyKeys, primaryDomainTaxonomy, params.missionBlock),
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
  type TaxoStats = { ok: number; questionable: number; wrong: number; confidenceTooLow: number; confidenceTooHigh: number; total: number };
  const taxoStats = new Map<string, TaxoStats>();
  const missingByTaxo = new Map<string, number>();

  for (const r of successful) {
    for (const cr of r.result!.classifications_review) {
      const stats = taxoStats.get(cr.taxonomy_key) ?? { ok: 0, questionable: 0, wrong: 0, confidenceTooLow: 0, confidenceTooHigh: 0, total: 0 };
      stats[cr.status]++;
      if (cr.confidence_status === "too_low") {
        stats.confidenceTooLow++;
      }
      if (cr.confidence_status === "too_high") {
        stats.confidenceTooHigh++;
      }
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
    `| taxonomy_key | ok | questionable | wrong | confiance trop basse | confiance trop haute | manquantes |`,
    `|---|---|---|---|---|---|---|`,
    ...[...taxoStats.entries()].map(([key, s]) => {
      const missing = missingByTaxo.get(key) ?? 0;
      return `| ${key} | ${pct(s.ok, s.total)} | ${pct(s.questionable, s.total)} | ${pct(s.wrong, s.total)} | ${pct(s.confidenceTooLow, s.total)} | ${pct(s.confidenceTooHigh, s.total)} | ${missing} missions |`;
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

const buildMissionIdsPath = (filePath: string): string => {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}-mission-ids.txt`);
};

const exportDataset = (missionIdsPath: string) => {
  const exportScriptPath = path.resolve(__dirname, "export-dataset.ts");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", exportScriptPath, "--version", version, "--ids-file", missionIdsPath, "--output", datasetOutputPath],
    { cwd: path.resolve(__dirname, "../.."), env: process.env, stdio: "inherit" }
  );

  if (result.status !== 0) {
    throw new Error(`export-dataset a échoué avec le code ${result.status ?? "inconnu"}`);
  }
};

async function main() {
  console.log(
    `[judge-enrichments] version=${version} limit=${missionIds.length > 0 ? missionIds.length : limit} missionIds=${missionIds.length || "latest"} output=${outputPath} report=${reportPath} datasetOutput=${datasetOutputPath} judgeModel=${JUDGE_MODEL_ID}`
  );

  const evaluatedVersion = resolveEvaluatedPromptVersion(version);
  const taxonomyKeys = resolveEvaluatedTaxonomyKeys(evaluatedVersion);
  const taxonomies = getTaxonomies(taxonomyKeys);
  const taxonomyBlock = buildTaxonomyBlock(toTaxonomyForPrompt(taxonomies));

  await pgConnected();

  const loadedEnrichments = await prisma.missionEnrichment.findMany({
    where: {
      status: "completed",
      promptVersion: version,
      ...(missionIds.length > 0 ? { missionId: { in: missionIds } } : {}),
    },
    include: {
      values: true,
      mission: { include: missionInclude },
    },
    take: missionIds.length > 0 ? undefined : limit,
    orderBy: { completedAt: "desc" },
  });

  const latestEnrichmentByMissionId = new Map<string, (typeof loadedEnrichments)[number]>();
  for (const enrichment of loadedEnrichments) {
    if (!latestEnrichmentByMissionId.has(enrichment.missionId)) {
      latestEnrichmentByMissionId.set(enrichment.missionId, enrichment);
    }
  }

  if (missionIds.length > 0 && latestEnrichmentByMissionId.size !== missionIds.length) {
    const foundMissionIds = new Set(latestEnrichmentByMissionId.keys());
    const missingMissionIds = missionIds.filter((missionId) => !foundMissionIds.has(missionId));
    throw new Error(`[judge-enrichments] ${missingMissionIds.length} mission IDs sans enrichissement ${version} terminé: ${missingMissionIds.join(", ")}`);
  }

  const enrichments = missionIds.length > 0 ? missionIds.map((missionId) => latestEnrichmentByMissionId.get(missionId)!) : loadedEnrichments;

  if (enrichments.length === 0) {
    console.warn(`[judge-enrichments] aucun enrichissement trouvé pour version=${version}`);
    await pgDisconnect();
    return;
  }

  console.log(`[judge-enrichments] ${enrichments.length} enrichissements chargés`);

  ensureParentDir(outputPath);
  ensureParentDir(reportPath);
  fs.writeFileSync(outputPath, `${CSV_HEADERS.join(",")}\n`, "utf-8");

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
      promptVersion: evaluatedVersion,
      taxonomyKeys,
      missionBlock,
      taxonomyBlock,
      values,
    });

    results.push(runResult);
    fs.appendFileSync(outputPath, `${resultToCsv(runResult)}\n`, "utf-8");

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

  if (shouldExportDataset) {
    const missionIdsPath = buildMissionIdsPath(outputPath);
    fs.writeFileSync(missionIdsPath, results.map((r) => r.missionId).join("\n"), "utf-8");
    console.log(`[judge-enrichments] export dataset sur le même échantillon — mission ids: ${missionIdsPath}`);
    exportDataset(missionIdsPath);
  }

  const successful = results.filter((r) => r.result);
  const errors = results.filter((r) => r.error);
  console.log(
    `[judge-enrichments] terminé — ${successful.length} succès / ${errors.length} erreurs — détails: ${outputPath}, rapport: ${reportPath}, dataset: ${datasetOutputPath}`
  );
}

main()
  .catch((error) => {
    console.error("[judge-enrichments] échec", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgDisconnect();
  });
