/**
 * Exécute le matching engine puis explique de façon concise pourquoi les missions sont pertinentes.
 *
 * Exécution :
 *   npx ts-node scripts/explain-matching-result.ts <userScoringId> [--limit N] [--version V]
 *
 * Options :
 *   --limit N     Nombre max de missions affichées (défaut : 5)
 *   --version V   Version du matching engine à analyser (défaut : version courante)
 */

import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { CURRENT_MATCHING_ENGINE_VERSION } from "@/services/matching-engine/types";
import type { MatchMissionItem, MatchingEngineDimension, MatchingEngineVersion, MissionMatchingResultItem } from "@/services/matching-engine/types";

const args = process.argv.slice(2);
const userScoringId = args.find((arg) => !arg.startsWith("--"));
const limitArgIndex = args.indexOf("--limit");
const versionArgIndex = args.indexOf("--version");

const limit = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : 5;
const version = (versionArgIndex !== -1 ? args[versionArgIndex + 1] : CURRENT_MATCHING_ENGINE_VERSION) as MatchingEngineVersion;

type StoredMissionMatchingResultItem = MissionMatchingResultItem;

type OverlapSignal = {
  dimensionKey: MatchingEngineDimension;
  dimensionLabel: string;
  valueLabel: string;
  userScore: number;
  missionScore: number;
};

type RankedMissionExplanationItem = MatchMissionItem & {
  title: string;
};

const parseStoredResults = (value: unknown): StoredMissionMatchingResultItem[] => {
  if (!Array.isArray(value)) {
    throw new Error("Le champ results de mission_matching_result n'est pas un tableau.");
  }

  return value
    .filter((item): item is { missionScoringId?: unknown; dimensionScores?: unknown } => typeof item === "object" && item !== null)
    .filter(
      (item): item is StoredMissionMatchingResultItem =>
        typeof item.missionScoringId === "string" &&
        typeof item.dimensionScores === "object" &&
        item.dimensionScores !== null &&
        !Array.isArray(item.dimensionScores)
    );
};

const buildDimensionExplanation = (params: {
  dimensionKey: MatchingEngineDimension;
  dimensionScore: number;
  overlaps: OverlapSignal[];
}): string => {
  if (params.overlaps.length === 0) {
    return `- ${params.dimensionKey} (${params.dimensionScore.toFixed(3)}): recouvrement détecté mais non résolu en libellé`;
  }

  const topLabels = params.overlaps
    .sort((left, right) => right.missionScore - left.missionScore || right.userScore - left.userScore || left.valueLabel.localeCompare(right.valueLabel, "fr"))
    .map((overlap) => overlap.valueLabel);

  const uniqueLabels = Array.from(new Set(topLabels));
  const preview = uniqueLabels.slice(0, 2).join(", ");
  const extraCount = Math.max(uniqueLabels.length - 2, 0);
  const suffix = extraCount > 0 ? ` (+${extraCount})` : "";

  return `- ${params.overlaps[0].dimensionLabel} (${params.dimensionScore.toFixed(3)}): match sur ${preview}${suffix}`;
};

const run = async () => {
  if (!userScoringId) {
    throw new Error("Usage: npx ts-node scripts/explain-matching-result.ts <userScoringId> [--limit N] [--version V]");
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`'--limit' doit être un entier strictement positif. Reçu: ${limit}`);
  }

  const ranking = await matchingEngineService.rankMissionsByUserScoring({
    userScoringId,
    version,
    limit,
  });

  const matchingResult = await prisma.missionMatchingResult.findUnique({
    where: {
      userScoringId_matchingEngineVersion: {
        userScoringId,
        matchingEngineVersion: version,
      },
    },
  });

  if (!matchingResult) {
    throw new Error(`Le matching engine n'a pas persisté de mission_matching_result pour userScoringId='${userScoringId}' et version='${version}'.`);
  }

  const storedResults = parseStoredResults(matchingResult.results);
  if (ranking.items.length === 0) {
    console.log(`[explain-matching-result] Aucun résultat retourné par le matching engine pour userScoringId=${userScoringId}`);
    return;
  }

  const storedResultsByMissionScoringId = new Map(storedResults.map((item) => [item.missionScoringId, item]));
  const missionScoringIds = ranking.items.map((item) => item.missionScoringId);

  const [userScoringValues, missionScorings] = await Promise.all([
    prisma.userScoringValue.findMany({
      where: { userScoringId },
      include: {
        taxonomyValue: {
          include: {
            taxonomy: {
              select: { key: true, label: true },
            },
          },
        },
      },
    }),
    prisma.missionScoring.findMany({
      where: { id: { in: missionScoringIds } },
      include: {
        mission: {
          select: { id: true, title: true },
        },
        missionScoringValues: {
          include: {
            taxonomyValue: {
              include: {
                taxonomy: {
                  select: { key: true, label: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const userValuesByTaxonomyValueId = new Map(
    userScoringValues.map((value) => [
      value.taxonomyValueId,
      {
        score: value.score,
        taxonomyKey: value.taxonomyValue.taxonomy.key as MatchingEngineDimension,
        taxonomyLabel: value.taxonomyValue.taxonomy.label,
        valueLabel: value.taxonomyValue.label,
      },
    ])
  );

  const missionScoringsById = new Map(missionScorings.map((missionScoring) => [missionScoring.id, missionScoring]));
  const explainedItems: RankedMissionExplanationItem[] = ranking.items
    .map((item) => {
      const missionScoring = missionScoringsById.get(item.missionScoringId);
      if (!missionScoring) {
        return null;
      }

      const storedResult = storedResultsByMissionScoringId.get(item.missionScoringId);

      return {
        ...item,
        title: missionScoring.mission.title,
        dimensionScores: storedResult?.dimensionScores ?? item.dimensionScores,
      };
    })
    .filter((item): item is RankedMissionExplanationItem => item !== null);

  console.log(
    `[explain-matching-result] userScoringId=${userScoringId} version=${version} missions_retournees=${ranking.items.length} missions_stockees=${storedResults.length} tookMs=${ranking.tookMs}`
  );

  for (const [index, rankedItem] of explainedItems.entries()) {
    const missionScoring = missionScoringsById.get(rankedItem.missionScoringId);

    if (!missionScoring) {
      console.log(`${index + 1}. missionScoringId=${rankedItem.missionScoringId} — scoring introuvable`);
      continue;
    }

    const overlapsByDimension = new Map<MatchingEngineDimension, OverlapSignal[]>();

    for (const missionValue of missionScoring.missionScoringValues) {
      const userValue = userValuesByTaxonomyValueId.get(missionValue.taxonomyValueId);
      if (!userValue) {
        continue;
      }

      const dimensionKey = missionValue.taxonomyValue.taxonomy.key as MatchingEngineDimension;
      const overlap: OverlapSignal = {
        dimensionKey,
        dimensionLabel: missionValue.taxonomyValue.taxonomy.label,
        valueLabel: missionValue.taxonomyValue.label,
        userScore: userValue.score,
        missionScore: missionValue.score,
      };

      const existing = overlapsByDimension.get(dimensionKey) ?? [];
      existing.push(overlap);
      overlapsByDimension.set(dimensionKey, existing);
    }

    console.log(
      `${index + 1}. ${rankedItem.title} [missionScoringId=${rankedItem.missionScoringId}] total=${rankedItem.totalScore.toFixed(3)} taxonomy=${rankedItem.taxonomyScore.toFixed(3)}${
        rankedItem.geoScore === null ? "" : ` geo=${rankedItem.geoScore.toFixed(3)}`
      }`
    );

    const dimensionEntries = Object.entries(rankedItem.dimensionScores)
      .filter((entry): entry is [MatchingEngineDimension, number] => typeof entry[1] === "number")
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"));

    if (dimensionEntries.length === 0) {
      console.log("   - aucun détail dimensionnel stocké");
      continue;
    }

    for (const [dimensionKey, dimensionScore] of dimensionEntries) {
      console.log(`   ${buildDimensionExplanation({ dimensionKey, dimensionScore, overlaps: overlapsByDimension.get(dimensionKey) ?? [] })}`);
    }
  }
};

run()
  .catch((error) => {
    console.error("[explain-matching-result] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
