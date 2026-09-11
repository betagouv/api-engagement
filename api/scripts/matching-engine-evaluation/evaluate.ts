/**
 * Évalue une ou plusieurs versions du matching engine à partir de profils JSON.
 *
 * Exécution :
 *   npm run evaluate:matching -- --profiles scripts/matching-engine-evaluation/profiles.template.json --versions m4,m5
 */

import fs from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ quiet: true });

import { isValidTaxonomyValueKey, parseTaxonomyValueKey } from "@engagement/taxonomy";
import { z } from "zod";

import { pgDisconnect, prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { CURRENT_MATCHING_ENGINE_VERSION, MATCHING_ENGINE_VERSION_KEYS } from "@/services/matching-engine/config";
import type { MatchMissionItem, MatchingEngineTaxonomy, MatchingEngineVersion } from "@/services/matching-engine/types";
import { getMissionScoringRuleKeys } from "@/services/mission-scoring/scoring-rules";
import { userScoringService } from "@/services/user-scoring";
import {
  evaluateExpectedTaxonomies,
  missionMatchesExpectedValue,
  type ExpectedTaxonomy,
  type ExpectedTaxonomyResult,
  type RankedMissionForEvaluation,
} from "./utils/evaluate-expected-taxonomies";

const TOP_LIMIT = 10;
const DIAGNOSTIC_PAGE_LIMIT = 90;
const DEFAULT_PROFILES_PATH = "scripts/matching-engine-evaluation/profiles.template.json";
const answerSchema = z
  .object({
    taxonomy: z.string().trim().min(1),
    value: z.string().trim().min(1).optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((answer) => (answer.value === undefined) !== (answer.params === undefined), {
    message: "Une réponse doit contenir exactement 'value' ou 'params'",
  })
  .refine((answer) => answer.value === undefined || isValidTaxonomyValueKey(`${answer.taxonomy}.${answer.value}`), {
    message: "La paire taxonomy/value n'existe pas dans le référentiel",
  });

const expectedValueSchema = z
  .object({
    value: z.string().trim().min(1),
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((expected) => expected.max === undefined || expected.min <= expected.max, {
    message: "max doit être supérieur ou égal à min",
    path: ["max"],
  });

const expectedTaxonomySchema = z
  .object({
    taxonomy: z.string().trim().min(1),
    values: z.array(expectedValueSchema).min(1),
  })
  .strict()
  .superRefine((expected, context) => {
    const seen = new Set<string>();
    expected.values.forEach((expectation, index) => {
      if (seen.has(expectation.value)) {
        context.addIssue({ code: "custom", path: ["values", index], message: "Valeur attendue dupliquée" });
      }
      seen.add(expectation.value);

      if (!isValidTaxonomyValueKey(`${expected.taxonomy}.${expectation.value}`)) {
        context.addIssue({
          code: "custom",
          path: ["values", index, "value"],
          message: `Valeur de taxonomie inconnue : ${expected.taxonomy}.${expectation.value}`,
        });
      }
    });
  });

const profileSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    userProfile: z
      .object({
        answers: z.array(answerSchema).min(1),
      })
      .strict(),
    expected: z.array(expectedTaxonomySchema).min(1),
  })
  .strict()
  .refine((profile) => new Set(profile.expected.map(({ taxonomy }) => taxonomy)).size === profile.expected.length, {
    path: ["expected"],
    message: "Une taxonomie attendue ne doit apparaître qu'une seule fois",
  });

const profilesFileSchema = z
  .object({ profiles: z.array(profileSchema).min(1) })
  .strict()
  .superRefine((input, context) => {
    const seen = new Set<string>();
    input.profiles.forEach((profile, index) => {
      if (seen.has(profile.id)) {
        context.addIssue({ code: "custom", path: ["profiles", index, "id"], message: `Identifiant de profil dupliqué : ${profile.id}` });
      }
      seen.add(profile.id);
    });
  });

type EvaluationProfile = z.infer<typeof profileSchema>;

type RankedMissionWithDiagnostics = RankedMissionForEvaluation & {
  position: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  taxonomyScores: Partial<Record<MatchingEngineTaxonomy, number>>;
};

type FailureReason = "below_min" | "above_max";

type FailureCandidate = Omit<RankedMissionWithDiagnostics, "taxonomyValues"> & {
  scoreGapToTop10: number;
};

type EvaluatedExpectation = ExpectedTaxonomyResult & {
  failureReason?: FailureReason;
  failureCandidate?: FailureCandidate | null;
  failureCandidateSearchMaxPosition?: number;
  failureCandidateSearchComplete?: boolean;
};

type VersionEvaluation = {
  version: MatchingEngineVersion;
  tookMs: number;
  totalCandidates: number;
  expectationCount: number;
  passedCount: number;
  successRate: number;
  diagnosticTookMs: number;
  diagnosticCandidatesScanned: number;
  expectations: EvaluatedExpectation[];
};

type ProfileEvaluation = {
  profileId: string;
  profileLabel: string;
  versions: VersionEvaluation[];
};

const args = process.argv.slice(2);

const getFlagValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Valeur manquante pour ${name}`);
  }
  return value;
};

const parseVersions = (raw: string | undefined): MatchingEngineVersion[] => {
  const values = raw ? raw.split(",").map((value) => value.trim()) : [CURRENT_MATCHING_ENGINE_VERSION];
  const validVersions = new Set<string>(MATCHING_ENGINE_VERSION_KEYS);
  const unknownVersions = values.filter((value) => !validVersions.has(value));
  if (unknownVersions.length > 0) {
    throw new Error(`Version(s) inconnue(s) : ${unknownVersions.join(", ")}. Valeurs possibles : ${MATCHING_ENGINE_VERSION_KEYS.join(", ")}`);
  }
  return Array.from(new Set(values)) as MatchingEngineVersion[];
};

const readProfiles = async (filePath: string): Promise<EvaluationProfile[]> => {
  const content = await fs.readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON invalide";
    throw new Error(`Impossible de lire ${filePath} : ${message}`);
  }

  const result = profilesFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Profil(s) invalide(s) dans ${filePath} :\n${z.prettifyError(result.error)}`);
  }
  return result.data.profiles;
};

const selectProfiles = (profiles: EvaluationProfile[], profileId: string | undefined): EvaluationProfile[] => {
  if (!profileId) {
    return profiles;
  }

  const profile = profiles.find(({ id }) => id === profileId);
  if (!profile) {
    throw new Error(`Profil '${profileId}' introuvable. Identifiants disponibles : ${profiles.map(({ id }) => id).join(", ")}`);
  }
  return [profile];
};

const loadRankedMissions = async (items: MatchMissionItem[], offset = 0): Promise<RankedMissionWithDiagnostics[]> => {
  const missionScoringIds = items.map((item) => item.missionScoringId);
  const missionScorings = await prisma.missionScoring.findMany({
    where: { id: { in: missionScoringIds } },
    select: {
      id: true,
      mission: {
        select: {
          id: true,
          title: true,
          publisherId: true,
          type: true,
          remote: true,
          openToMinors: true,
          compensationAmount: true,
        },
      },
      missionScoringValues: { select: { taxonomyKey: true, valueKey: true } },
    },
  });
  const byId = new Map(missionScorings.map((missionScoring) => [missionScoring.id, missionScoring]));

  return items.map((item, index) => {
    const missionScoring = byId.get(item.missionScoringId);
    const deterministicValues = missionScoring
      ? getMissionScoringRuleKeys(missionScoring.mission).flatMap((key) => {
          const parsed = parseTaxonomyValueKey(key);
          return parsed ? [{ taxonomy: parsed.taxonomyKey, value: parsed.valueKey }] : [];
        })
      : [];
    const persistedValues = (missionScoring?.missionScoringValues ?? []).flatMap(({ taxonomyKey, valueKey }) =>
      taxonomyKey && valueKey ? [{ taxonomy: taxonomyKey, value: valueKey }] : []
    );
    const taxonomyValues = Array.from(new Map([...persistedValues, ...deterministicValues].map((value) => [`${value.taxonomy}.${value.value}`, value])).values());
    return {
      missionId: item.missionId,
      missionScoringId: item.missionScoringId,
      missionTitle: missionScoring?.mission.title ?? null,
      totalScore: item.totalScore,
      position: offset + index + 1,
      taxonomyScore: item.taxonomyScore,
      geoScore: item.geoScore,
      distanceKm: item.distanceKm,
      taxonomyScores: item.taxonomyScores,
      taxonomyValues,
    };
  });
};

const expectationKey = (expectation: Pick<ExpectedTaxonomyResult, "taxonomy" | "expectedValues">): string => `${expectation.taxonomy}.${expectation.expectedValues[0]}`;

const toFailureCandidate = (mission: RankedMissionWithDiagnostics, top10CutoffScore: number | null): FailureCandidate => ({
  position: mission.position,
  missionId: mission.missionId,
  missionScoringId: mission.missionScoringId,
  missionTitle: mission.missionTitle,
  totalScore: mission.totalScore,
  taxonomyScore: mission.taxonomyScore,
  geoScore: mission.geoScore,
  distanceKm: mission.distanceKm,
  taxonomyScores: mission.taxonomyScores,
  scoreGapToTop10: top10CutoffScore === null ? 0 : Number(Math.max(0, top10CutoffScore - mission.totalScore).toFixed(6)),
});

const diagnoseFailedExpectations = async (params: {
  userScoringId: string;
  version: MatchingEngineVersion;
  totalCandidates: number;
  topMissions: RankedMissionWithDiagnostics[];
  expectations: ExpectedTaxonomyResult[];
}): Promise<{ expectations: EvaluatedExpectation[]; tookMs: number; candidatesScanned: number }> => {
  const top10CutoffScore = params.topMissions[params.topMissions.length - 1]?.totalScore ?? null;
  const candidatesByExpectation = new Map<string, RankedMissionWithDiagnostics>();
  const belowMinimum = params.expectations.filter((expectation) => !expectation.found && expectation.count < expectation.min);
  const pending = new Map(belowMinimum.map((expectation) => [expectationKey(expectation), expectation]));
  let total = params.totalCandidates;
  let tookMs = 0;
  let candidatesScanned = 0;
  let searchMaxPosition = TOP_LIMIT;

  // Un seul recalcul borné : parcourir tout le corpus rend l'évaluation très lente
  // lorsqu'aucune mission ne porte la valeur attendue.
  if (pending.size > 0 && TOP_LIMIT < total) {
    const ranking = await matchingEngineService.rankMissionsByUserScoring({
      userScoringId: params.userScoringId,
      version: params.version,
      limit: Math.min(DIAGNOSTIC_PAGE_LIMIT, total - TOP_LIMIT),
      offset: TOP_LIMIT,
      persistMatchingResult: false,
    });
    tookMs += ranking.tookMs;
    total = ranking.total;

    const rankedMissions = await loadRankedMissions(ranking.items, TOP_LIMIT);
    candidatesScanned += rankedMissions.length;
    searchMaxPosition = TOP_LIMIT + rankedMissions.length;

    for (const [key, expectation] of pending) {
      const candidate = rankedMissions.find((mission) => missionMatchesExpectedValue(mission, expectation.taxonomy, expectation.expectedValues[0]));
      if (candidate) {
        candidatesByExpectation.set(key, candidate);
        pending.delete(key);
      }
    }
  }

  const searchComplete = searchMaxPosition >= total;

  const expectations = params.expectations.map((expectation): EvaluatedExpectation => {
    if (expectation.found) {
      return expectation;
    }

    const failureReason: FailureReason = expectation.count < expectation.min ? "below_min" : "above_max";
    const candidate =
      failureReason === "below_min"
        ? candidatesByExpectation.get(expectationKey(expectation))
        : params.topMissions.find((mission) => missionMatchesExpectedValue(mission, expectation.taxonomy, expectation.expectedValues[0]));

    return {
      ...expectation,
      failureReason,
      failureCandidate: candidate ? toFailureCandidate(candidate, top10CutoffScore) : null,
      failureCandidateSearchMaxPosition: failureReason === "below_min" ? searchMaxPosition : TOP_LIMIT,
      failureCandidateSearchComplete: failureReason === "above_max" || candidate !== undefined || searchComplete,
    };
  });

  return { expectations, tookMs, candidatesScanned };
};

const evaluateVersion = async (params: { userScoringId: string; version: MatchingEngineVersion; expected: ExpectedTaxonomy[] }): Promise<VersionEvaluation> => {
  const ranking = await matchingEngineService.rankMissionsByUserScoring({
    userScoringId: params.userScoringId,
    version: params.version,
    limit: TOP_LIMIT,
    persistMatchingResult: false,
  });
  const rankedMissions = await loadRankedMissions(ranking.items);
  const top10Expectations = evaluateExpectedTaxonomies(rankedMissions, params.expected);
  const diagnostic = await diagnoseFailedExpectations({
    userScoringId: params.userScoringId,
    version: params.version,
    totalCandidates: ranking.total,
    topMissions: rankedMissions,
    expectations: top10Expectations,
  });
  const expectations = diagnostic.expectations;
  const passedCount = expectations.filter((expectation) => expectation.found).length;

  return {
    version: params.version,
    tookMs: ranking.tookMs,
    totalCandidates: ranking.total,
    expectationCount: expectations.length,
    passedCount,
    successRate: Number((passedCount / expectations.length).toFixed(4)),
    diagnosticTookMs: diagnostic.tookMs,
    diagnosticCandidatesScanned: diagnostic.candidatesScanned,
    expectations,
  };
};

const evaluateProfile = async (profile: EvaluationProfile, versions: MatchingEngineVersion[], runId: string): Promise<ProfileEvaluation> => {
  const { id: userScoringId } = await userScoringService.create({
    answers: profile.userProfile.answers,
    distinctId: `matching-evaluation:${runId}:${profile.id}`,
    missionAlertEnabled: false,
  });

  try {
    const versionEvaluations: VersionEvaluation[] = [];
    for (const version of versions) {
      versionEvaluations.push(
        await evaluateVersion({
          userScoringId,
          version,
          expected: profile.expected,
        })
      );
    }

    return {
      profileId: profile.id,
      profileLabel: profile.label,
      versions: versionEvaluations,
    };
  } finally {
    // La suppression cascade aussi les réponses, la géolocalisation et les matching_result.
    await prisma.userScoring.deleteMany({ where: { id: userScoringId } });
  }
};

const printHumanReport = (profiles: ProfileEvaluation[]): void => {
  const rows = profiles.flatMap((profile) =>
    profile.versions.flatMap((version) =>
      version.expectations.map((expectation) => {
        return {
          profil: profile.profileId,
          version: version.version,
          taxonomie: expectation.taxonomy,
          valeur: expectation.expectedValues[0],
          attendu:
            expectation.max === undefined ? `au moins ${expectation.min}` : expectation.min === expectation.max ? `${expectation.min}` : `${expectation.min} à ${expectation.max}`,
          occurrences: expectation.count,
          positions: expectation.positions.join(", ") || "absent",
          résultat: expectation.found ? "OK" : "ÉCHEC",
          candidat_échec: expectation.found
            ? "—"
            : expectation.failureCandidate
              ? `#${expectation.failureCandidate.position} · score=${expectation.failureCandidate.totalScore.toFixed(6)} · écart_top10=${expectation.failureCandidate.scoreGapToTop10.toFixed(6)}`
              : expectation.failureCandidateSearchComplete
                ? "aucune mission correspondante"
                : `non trouvée jusqu'au rang ${expectation.failureCandidateSearchMaxPosition}`,
        };
      })
    )
  );

  console.table(rows);
  for (const profile of profiles) {
    for (const version of profile.versions) {
      console.log(
        `[matching-evaluation] profil=${profile.profileId} version=${version.version} attentes=${version.passedCount}/${version.expectationCount} top=${TOP_LIMIT} durée=${version.tookMs}ms diagnostic=${version.diagnosticTookMs}ms candidats_analysés=${version.diagnosticCandidatesScanned}`
      );
    }
  }
};

const run = async (): Promise<void> => {
  const profilesPath = path.resolve(getFlagValue("--profiles") ?? DEFAULT_PROFILES_PATH);
  const versions = parseVersions(getFlagValue("--versions"));
  const profileId = getFlagValue("--profile-id");
  const profiles = selectProfiles(await readProfiles(profilesPath), profileId);

  if (args.includes("--validate-only")) {
    const validation = { valid: true, profilesPath, profileId: profileId ?? null, profileCount: profiles.length, versions };
    if (args.includes("--json")) {
      process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
    } else {
      console.log(`[matching-evaluation] ${profiles.length} profil(s) valide(s) dans ${profilesPath}`);
    }
    return;
  }

  const runId = `${Date.now()}-${process.pid}`;
  const results: ProfileEvaluation[] = [];

  for (const profile of profiles) {
    results.push(await evaluateProfile(profile, versions, runId));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    topLimit: TOP_LIMIT,
    versions,
    profiles: results,
  };

  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHumanReport(results);
  }
};

run()
  .catch((error: unknown) => {
    // Conserver les propriétés Prisma (`code`, `meta`, `cause`) : certains adapters ne les
    // recopient pas dans `message`, ce qui rendrait autrement l'erreur inexploitable.
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgDisconnect();
  });
