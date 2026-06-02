/**
 * Benchmark du matching engine sur les donnees PostgreSQL disponibles.
 *
 * Execution :
 *   npx ts-node scripts/benchmark-matching-engine.ts [options]
 *
 * Options :
 *   --user-scoring-id ID       Profil a benchmarker, repetable
 *   --sample-size N            Nombre de profils auto-selectionnes si aucun id n'est fourni (defaut : 8)
 *   --iterations N             Iterations mesurees par scenario/profil (defaut : 5)
 *   --warmup N                 Iterations non mesurees par scenario/profil (defaut : 1)
 *   --limits 20,50,100         Tailles de page a tester (defaut : 20,100,500)
 *   --offsets 1,100            Offsets a tester (defaut : 1 pour eviter la persistance du service)
 *   --taxonomy-weight N        Poids taxonomie (defaut : moteur)
 *   --geo-weight N             Poids geo (defaut : moteur)
 *   --geo-half-decay-km N      Demi-vie geo en km (defaut : moteur)
 *   --json                     Sortie JSON au lieu du tableau console
 *   --explain                  Imprime EXPLAIN (ANALYZE, BUFFERS, VERBOSE) au lieu de mesurer
 */

import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { CURRENT_MATCHING_ENGINE_VERSION } from "@/services/matching-engine/config";
import type { MatchingEngineVersion, RankMissionsByUserScoringInput } from "@/services/matching-engine/types";
import { GATE_TAXONOMIES } from "@engagement/taxonomy";

const args = process.argv.slice(2);
const SCRIPT_LABEL = "benchmark-matching-engine";

type BenchmarkOptions = {
  userScoringIds: string[];
  sampleSize: number;
  iterations: number;
  warmup: number;
  limits: number[];
  offsets: number[];
  version: MatchingEngineVersion;
  taxonomyWeight?: number;
  geoWeight?: number;
  geoHalfDecayKm?: number;
  json: boolean;
  explain: boolean;
};

type UserScoringCandidate = {
  id: string;
  value_count: number;
  taxonomy_count: number;
  gate_value_count: number;
  has_geo: boolean;
};

type DatasetSummary = {
  activeMissionCount: number;
  activeMissionScoringCount: number;
  missionScoringValueCount: number;
  missionAddressWithGeoCount: number;
};

type ScenarioResult = {
  userScoringId: string;
  profile: {
    valueCount: number;
    taxonomyCount: number;
    gateValueCount: number;
    hasGeo: boolean;
  };
  scenario: {
    limit: number;
    offset: number;
    taxonomyWeight?: number;
    geoWeight?: number;
    geoHalfDecayKm?: number;
  };
  itemCount: number;
  measuredMs: number[];
  serviceTookMs: number[];
  stats: {
    minMs: number;
    medianMs: number;
    averageMs: number;
    p95Ms: number;
    maxMs: number;
  };
};

const getFlagValue = (flag: string): string | null => {
  const index = args.indexOf(flag);
  return index === -1 ? null : (args[index + 1] ?? null);
};

const getAllFlagValues = (flag: string): string[] => {
  const values: string[] = [];

  for (let index = 0; index < args.length; index++) {
    if (args[index] === flag && args[index + 1]) {
      values.push(args[index + 1]);
    }
  }

  return values;
};

const parsePositiveInteger = (flag: string, defaultValue: number): number => {
  const rawValue = getFlagValue(flag);
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} doit etre un entier strictement positif. Recu: ${rawValue}`);
  }

  return parsed;
};

const parsePositiveOrZeroInteger = (flag: string, defaultValue: number): number => {
  const rawValue = getFlagValue(flag);
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} doit etre un entier positif ou nul. Recu: ${rawValue}`);
  }

  return parsed;
};

const parseNumber = (flag: string): number | undefined => {
  const rawValue = getFlagValue(flag);
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} doit etre un nombre. Recu: ${rawValue}`);
  }

  return parsed;
};

const parseIntegerList = (flag: string, defaultValue: number[]): number[] => {
  const rawValue = getFlagValue(flag);
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = rawValue.split(",").map((value) => Number.parseInt(value.trim(), 10));
  if (parsed.length === 0 || parsed.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(`${flag} doit etre une liste d'entiers positifs ou nuls. Recu: ${rawValue}`);
  }

  return Array.from(new Set(parsed));
};

const parseOptions = (): BenchmarkOptions => ({
  userScoringIds: getAllFlagValues("--user-scoring-id"),
  sampleSize: parsePositiveInteger("--sample-size", 8),
  iterations: parsePositiveInteger("--iterations", 5),
  warmup: parsePositiveOrZeroInteger("--warmup", 1),
  limits: parseIntegerList("--limits", [20, 100, 500]).filter((limit) => limit > 0),
  offsets: parseIntegerList("--offsets", [1]),
  version: (getFlagValue("--version") ?? CURRENT_MATCHING_ENGINE_VERSION) as MatchingEngineVersion,
  taxonomyWeight: parseNumber("--taxonomy-weight"),
  geoWeight: parseNumber("--geo-weight"),
  geoHalfDecayKm: parseNumber("--geo-half-decay-km"),
  json: args.includes("--json"),
  explain: args.includes("--explain"),
});

const roundMs = (value: number): number => Number(value.toFixed(2));

const percentile = (sortedValues: number[], percentileRank: number): number => {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.ceil((percentileRank / 100) * sortedValues.length) - 1);
  return sortedValues[index];
};

const buildStats = (values: number[]) => {
  const sortedValues = [...values].sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    minMs: roundMs(sortedValues[0] ?? 0),
    medianMs: roundMs(percentile(sortedValues, 50)),
    averageMs: roundMs(total / Math.max(values.length, 1)),
    p95Ms: roundMs(percentile(sortedValues, 95)),
    maxMs: roundMs(sortedValues[sortedValues.length - 1] ?? 0),
  };
};

const measureMs = async <T>(callback: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  const startedAt = process.hrtime.bigint();
  const value = await callback();
  const endedAt = process.hrtime.bigint();

  return {
    value,
    ms: Number(endedAt - startedAt) / 1_000_000,
  };
};

const getDatasetSummary = async (): Promise<DatasetSummary> => {
  const [activeMissionCount, activeMissionScoringCount, missionScoringValueCount, missionAddressWithGeoCount] = await Promise.all([
    prisma.mission.count({
      where: {
        deletedAt: null,
        statusCode: "ACCEPTED",
      },
    }),
    prisma.missionScoring.count({
      where: {
        mission: {
          deletedAt: null,
          statusCode: "ACCEPTED",
        },
        missionEnrichment: {
          status: "completed",
        },
      },
    }),
    prisma.missionScoringValue.count(),
    prisma.missionAddress.count({
      where: {
        locationLat: { not: null },
        locationLon: { not: null },
      },
    }),
  ]);

  return {
    activeMissionCount,
    activeMissionScoringCount,
    missionScoringValueCount,
    missionAddressWithGeoCount,
  };
};

const getExplicitUserScorings = async (userScoringIds: string[]): Promise<UserScoringCandidate[]> => {
  if (userScoringIds.length === 0) {
    return [];
  }

  return prisma.$queryRaw<UserScoringCandidate[]>`
    SELECT
      us."id",
      COUNT(usv."id")::int AS "value_count",
      COUNT(DISTINCT usv."taxonomy_key")::int AS "taxonomy_count",
      COUNT(usv."id") FILTER (WHERE usv."taxonomy_key" IN (${Prisma.join(GATE_TAXONOMIES)}))::int AS "gate_value_count",
      EXISTS (
        SELECT 1
        FROM "user_scoring_geo" usg
        WHERE usg."user_scoring_id" = us."id"
      ) AS "has_geo"
    FROM "user_scoring" us
    LEFT JOIN "user_scoring_value" usv
      ON usv."user_scoring_id" = us."id"
    WHERE us."id" IN (${Prisma.join(userScoringIds)})
      AND (us."expires_at" IS NULL OR us."expires_at" > NOW())
    GROUP BY us."id"
    ORDER BY us."id" ASC
  `;
};

const getSampledUserScorings = async (sampleSize: number): Promise<UserScoringCandidate[]> =>
  prisma.$queryRaw<UserScoringCandidate[]>`
    WITH candidates AS (
      SELECT
        us."id",
        COUNT(usv."id")::int AS "value_count",
        COUNT(DISTINCT usv."taxonomy_key")::int AS "taxonomy_count",
        COUNT(usv."id") FILTER (WHERE usv."taxonomy_key" IN (${Prisma.join(GATE_TAXONOMIES)}))::int AS "gate_value_count",
        EXISTS (
          SELECT 1
          FROM "user_scoring_geo" usg
          WHERE usg."user_scoring_id" = us."id"
        ) AS "has_geo"
      FROM "user_scoring" us
      LEFT JOIN "user_scoring_value" usv
        ON usv."user_scoring_id" = us."id"
      WHERE us."expires_at" IS NULL OR us."expires_at" > NOW()
      GROUP BY us."id"
    ),
    ranked AS (
      SELECT
        candidates.*,
        ROW_NUMBER() OVER (
          PARTITION BY candidates."has_geo", width_bucket(candidates."value_count", 0, 30, 3)
          ORDER BY candidates."value_count" DESC, candidates."id" ASC
        ) AS "bucket_rank"
      FROM candidates
      WHERE candidates."value_count" > 0
    )
    SELECT
      "id",
      "value_count",
      "taxonomy_count",
      "gate_value_count",
      "has_geo"
    FROM ranked
    WHERE "bucket_rank" = 1
    ORDER BY "has_geo" DESC, "value_count" DESC, "id" ASC
    LIMIT ${sampleSize}
  `;

const buildRankingInput = (options: BenchmarkOptions, userScoringId: string, limit: number, offset: number): RankMissionsByUserScoringInput => ({
  userScoringId,
  version: options.version,
  limit,
  offset,
  taxonomyWeight: options.taxonomyWeight,
  geoWeight: options.geoWeight,
  geoHalfDecayKm: options.geoHalfDecayKm,
});

const benchmarkScenario = async (params: { options: BenchmarkOptions; userScoring: UserScoringCandidate; limit: number; offset: number }): Promise<ScenarioResult> => {
  const measuredMs: number[] = [];
  const serviceTookMs: number[] = [];
  let itemCount = 0;
  const input = buildRankingInput(params.options, params.userScoring.id, params.limit, params.offset);

  for (let index = 0; index < params.options.warmup; index++) {
    await matchingEngineService.rankMissionsByUserScoring(input);
  }

  for (let index = 0; index < params.options.iterations; index++) {
    const measured = await measureMs(() => matchingEngineService.rankMissionsByUserScoring(input));
    itemCount = measured.value.items.length;
    measuredMs.push(roundMs(measured.ms));
    serviceTookMs.push(measured.value.tookMs);
  }

  return {
    userScoringId: params.userScoring.id,
    profile: {
      valueCount: params.userScoring.value_count,
      taxonomyCount: params.userScoring.taxonomy_count,
      gateValueCount: params.userScoring.gate_value_count,
      hasGeo: params.userScoring.has_geo,
    },
    scenario: {
      limit: params.limit,
      offset: params.offset,
      taxonomyWeight: params.options.taxonomyWeight,
      geoWeight: params.options.geoWeight,
      geoHalfDecayKm: params.options.geoHalfDecayKm,
    },
    itemCount,
    measuredMs,
    serviceTookMs,
    stats: buildStats(measuredMs),
  };
};

const printTable = (params: { dataset: DatasetSummary; options: BenchmarkOptions; results: ScenarioResult[] }) => {
  console.log(`[${SCRIPT_LABEL}] Dataset`);
  console.table({
    activeMissions: params.dataset.activeMissionCount,
    activeMissionScorings: params.dataset.activeMissionScoringCount,
    missionScoringValues: params.dataset.missionScoringValueCount,
    missionAddressesWithGeo: params.dataset.missionAddressWithGeoCount,
  });

  console.log(`[${SCRIPT_LABEL}] version=${params.options.version} iterations=${params.options.iterations} warmup=${params.options.warmup}`);

  console.table(
    params.results.map((result) => ({
      userScoringId: result.userScoringId,
      values: result.profile.valueCount,
      taxonomies: result.profile.taxonomyCount,
      gates: result.profile.gateValueCount,
      geo: result.profile.hasGeo,
      limit: result.scenario.limit,
      offset: result.scenario.offset,
      items: result.itemCount,
      minMs: result.stats.minMs,
      medianMs: result.stats.medianMs,
      avgMs: result.stats.averageMs,
      p95Ms: result.stats.p95Ms,
      maxMs: result.stats.maxMs,
    }))
  );
};

const run = async () => {
  const options = parseOptions();
  if (options.limits.length === 0) {
    throw new Error("--limits doit contenir au moins une valeur strictement positive.");
  }

  await prisma.$connect();

  try {
    const [dataset, userScorings] = await Promise.all([
      getDatasetSummary(),
      options.userScoringIds.length > 0 ? getExplicitUserScorings(options.userScoringIds) : getSampledUserScorings(options.sampleSize),
    ]);

    if (userScorings.length === 0) {
      throw new Error("Aucun user_scoring actif trouve. Utiliser --user-scoring-id ou creer des profils via l'API user-scoring.");
    }

    const missingIds = options.userScoringIds.filter((id) => !userScorings.some((userScoring) => userScoring.id === id));
    if (missingIds.length > 0) {
      throw new Error(`user_scoring introuvable ou expire: ${missingIds.join(", ")}`);
    }

    if (options.explain) {
      for (const userScoring of userScorings) {
        for (const limit of options.limits) {
          for (const offset of options.offsets) {
            const input = buildRankingInput(options, userScoring.id, limit, offset);
            console.log(
              `\n[${SCRIPT_LABEL}] EXPLAIN userScoringId=${userScoring.id} values=${userScoring.value_count} gates=${userScoring.gate_value_count} geo=${userScoring.has_geo} limit=${limit} offset=${offset}`
            );
            const plan = await matchingEngineService.explainRankMissionsByUserScoring(input);
            console.log(plan);
          }
        }
      }
      return;
    }

    const results: ScenarioResult[] = [];
    const scenarioCount = userScorings.length * options.limits.length * options.offsets.length;
    let currentScenario = 0;

    for (const userScoring of userScorings) {
      for (const limit of options.limits) {
        for (const offset of options.offsets) {
          currentScenario++;
          if (!options.json) {
            console.log(
              `[${SCRIPT_LABEL}] ${currentScenario}/${scenarioCount} userScoringId=${userScoring.id} values=${userScoring.value_count} geo=${userScoring.has_geo} limit=${limit} offset=${offset}`
            );
          }

          results.push(
            await benchmarkScenario({
              options,
              userScoring,
              limit,
              offset,
            })
          );
        }
      }
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            dataset,
            options,
            results,
          },
          null,
          2
        )
      );
      return;
    }

    printTable({ dataset, options, results });
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error) => {
  console.error(`[${SCRIPT_LABEL}] Fatal error:`, error);
  process.exit(1);
});
