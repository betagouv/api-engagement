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
import type { MatchMissionItem, MatchingEngineVersion } from "@/services/matching-engine/types";
import { getMissionScoringRuleKeys } from "@/services/mission-scoring/scoring-rules";
import { userScoringService } from "@/services/user-scoring";
import { evaluateExpectedTaxonomies, type ExpectedTaxonomy, type RankedMissionForEvaluation } from "./utils/evaluate-expected-taxonomies";

const TOP_LIMIT = 10;
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

type VersionEvaluation = {
  version: MatchingEngineVersion;
  tookMs: number;
  totalCandidates: number;
  expectationCount: number;
  passedCount: number;
  successRate: number;
  expectations: ReturnType<typeof evaluateExpectedTaxonomies>;
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

const loadRankedMissions = async (items: MatchMissionItem[]): Promise<RankedMissionForEvaluation[]> => {
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

  return items.map((item) => {
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
      taxonomyValues,
    };
  });
};

const evaluateVersion = async (params: { userScoringId: string; version: MatchingEngineVersion; expected: ExpectedTaxonomy[] }): Promise<VersionEvaluation> => {
  const ranking = await matchingEngineService.rankMissionsByUserScoring({
    userScoringId: params.userScoringId,
    version: params.version,
    limit: TOP_LIMIT,
    persistMatchingResult: false,
  });
  const rankedMissions = await loadRankedMissions(ranking.items);
  const expectations = evaluateExpectedTaxonomies(rankedMissions, params.expected);
  const passedCount = expectations.filter((expectation) => expectation.found).length;

  return {
    version: params.version,
    tookMs: ranking.tookMs,
    totalCandidates: ranking.total,
    expectationCount: expectations.length,
    passedCount,
    successRate: Number((passedCount / expectations.length).toFixed(4)),
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
        };
      })
    )
  );

  console.table(rows);
  for (const profile of profiles) {
    for (const version of profile.versions) {
      console.log(
        `[matching-evaluation] profil=${profile.profileId} version=${version.version} attentes=${version.passedCount}/${version.expectationCount} top=${TOP_LIMIT} durée=${version.tookMs}ms`
      );
    }
  }
};

const run = async (): Promise<void> => {
  const profilesPath = path.resolve(getFlagValue("--profiles") ?? DEFAULT_PROFILES_PATH);
  const versions = parseVersions(getFlagValue("--versions"));
  const profiles = await readProfiles(profilesPath);

  if (args.includes("--validate-only")) {
    const validation = { valid: true, profilesPath, profileCount: profiles.length, versions };
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
