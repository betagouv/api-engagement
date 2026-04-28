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
import { CURRENT_MATCHING_ENGINE_VERSION } from "@/services/matching-engine/config";
import type { MatchMissionItem, MatchingEngineTaxonomy, MatchingEngineVersion, MissionMatchingResultItem } from "@/services/matching-engine/types";

const args = process.argv.slice(2);
const userScoringId = args.find((arg) => !arg.startsWith("--"));
const limitArgIndex = args.indexOf("--limit");
const versionArgIndex = args.indexOf("--version");

const limit = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : 5;
const version = (versionArgIndex !== -1 ? args[versionArgIndex + 1] : CURRENT_MATCHING_ENGINE_VERSION) as MatchingEngineVersion;

type StoredMissionMatchingResultItem = MissionMatchingResultItem;

type OverlapSignal = {
  taxonomyKey: MatchingEngineTaxonomy;
  taxonomyLabel: string;
  valueLabel: string;
  userScore: number;
  missionScore: number;
};

type UserTaxonomySummary = {
  taxonomyKey: MatchingEngineTaxonomy;
  taxonomyLabel: string;
  values: string[];
};

type UserScoringValueWithTaxonomy = {
  taxonomyValue: {
    label: string;
    taxonomy: {
      key: string;
      label: string;
    };
  };
};

type RankedMissionExplanationItem = MatchMissionItem & {
  title: string;
};

const parseStoredResults = (value: unknown): StoredMissionMatchingResultItem[] => {
  if (!Array.isArray(value)) {
    throw new Error("Le champ results de mission_matching_result n'est pas un tableau.");
  }

  return value
    .filter((item): item is { missionScoringId?: unknown; taxonomyScores?: unknown } => typeof item === "object" && item !== null)
    .filter(
      (item): item is StoredMissionMatchingResultItem =>
        typeof item.missionScoringId === "string" && typeof item.taxonomyScores === "object" && item.taxonomyScores !== null && !Array.isArray(item.taxonomyScores)
    );
};

const buildTaxonomyExplanation = (params: { taxonomyKey: MatchingEngineTaxonomy; taxonomyScore: number; overlaps: OverlapSignal[] }): string => {
  if (params.overlaps.length === 0) {
    return `- ${params.taxonomyKey} (${params.taxonomyScore.toFixed(3)}): recouvrement détecté mais non résolu en libellé`;
  }

  const topLabels = params.overlaps
    .sort((left, right) => right.missionScore - left.missionScore || right.userScore - left.userScore || left.valueLabel.localeCompare(right.valueLabel, "fr"))
    .map((overlap) => overlap.valueLabel);

  const uniqueLabels = Array.from(new Set(topLabels));
  const preview = uniqueLabels.slice(0, 2).join(", ");
  const extraCount = Math.max(uniqueLabels.length - 2, 0);
  const suffix = extraCount > 0 ? ` (+${extraCount})` : "";

  return `- ${params.overlaps[0].taxonomyLabel} (${params.taxonomyScore.toFixed(3)}): match sur ${preview}${suffix}`;
};

const buildUserTaxonomySummary = (params: { values: UserScoringValueWithTaxonomy[] }): UserTaxonomySummary[] => {
  const byTaxonomy = new Map<MatchingEngineTaxonomy, UserTaxonomySummary>();

  for (const value of params.values) {
    const taxonomyKey = value.taxonomyValue.taxonomy.key as MatchingEngineTaxonomy;
    const existing = byTaxonomy.get(taxonomyKey);

    if (!existing) {
      byTaxonomy.set(taxonomyKey, {
        taxonomyKey,
        taxonomyLabel: value.taxonomyValue.taxonomy.label,
        values: [value.taxonomyValue.label],
      });
      continue;
    }

    existing.values.push(value.taxonomyValue.label);
  }

  return Array.from(byTaxonomy.values())
    .map((entry) => ({
      ...entry,
      values: Array.from(new Set(entry.values)).sort((left, right) => left.localeCompare(right, "fr")),
    }))
    .sort((left, right) => left.taxonomyLabel.localeCompare(right.taxonomyLabel, "fr"));
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
        taxonomyKey: value.taxonomyValue.taxonomy.key as MatchingEngineTaxonomy,
        taxonomyLabel: value.taxonomyValue.taxonomy.label,
        valueLabel: value.taxonomyValue.label,
      },
    ])
  );
  const userTaxonomySummaries = buildUserTaxonomySummary({ values: userScoringValues });

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
        taxonomyScores: storedResult?.taxonomyScores ?? item.taxonomyScores,
      };
    })
    .filter((item): item is RankedMissionExplanationItem => item !== null);

  console.log(
    `[explain-matching-result] userScoringId=${userScoringId} version=${version} missions_retournees=${ranking.items.length} missions_stockees=${storedResults.length} tookMs=${ranking.tookMs}`
  );

  console.log("## Profil user scoring");

  if (userTaxonomySummaries.length === 0) {
    console.log("Aucune taxonomie renseignée");
  } else {
    for (const summary of userTaxonomySummaries) {
      const preview = summary.values.slice(0, 3).join(", ");
      const extraCount = Math.max(summary.values.length - 3, 0);
      const suffix = extraCount > 0 ? ` (+${extraCount})` : "";
      console.log(`- ${summary.taxonomyLabel}: ${preview}${suffix}`);
    }
  }

  console.log("## Mission scoring");

  for (const [index, rankedItem] of explainedItems.entries()) {
    const missionScoring = missionScoringsById.get(rankedItem.missionScoringId);

    if (!missionScoring) {
      console.log(`${index + 1}. missionScoringId=${rankedItem.missionScoringId} — scoring introuvable`);
      continue;
    }

    const overlapsByTaxonomy = new Map<MatchingEngineTaxonomy, OverlapSignal[]>();

    for (const missionValue of missionScoring.missionScoringValues) {
      const userValue = userValuesByTaxonomyValueId.get(missionValue.taxonomyValueId);
      if (!userValue) {
        continue;
      }

      const taxonomyKey = missionValue.taxonomyValue.taxonomy.key as MatchingEngineTaxonomy;
      const overlap: OverlapSignal = {
        taxonomyKey,
        taxonomyLabel: missionValue.taxonomyValue.taxonomy.label,
        valueLabel: missionValue.taxonomyValue.label,
        userScore: userValue.score,
        missionScore: missionValue.score,
      };

      const existing = overlapsByTaxonomy.get(taxonomyKey) ?? [];
      existing.push(overlap);
      overlapsByTaxonomy.set(taxonomyKey, existing);
    }

    console.log(
      `${index + 1}. ${rankedItem.title} [missionScoringId=${rankedItem.missionScoringId}] total=${rankedItem.totalScore.toFixed(3)} taxonomy=${rankedItem.taxonomyScore.toFixed(3)}${
        rankedItem.geoScore === null ? "" : ` geo=${rankedItem.geoScore.toFixed(3)}`
      }`
    );

    const taxonomyEntries = Object.entries(rankedItem.taxonomyScores)
      .filter((entry): entry is [MatchingEngineTaxonomy, number] => typeof entry[1] === "number")
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"));

    if (taxonomyEntries.length === 0) {
      console.log("   - aucun détail taxonomique stocké");
      continue;
    }

    for (const [taxonomyKey, taxonomyScore] of taxonomyEntries) {
      console.log(`   ${buildTaxonomyExplanation({ taxonomyKey, taxonomyScore, overlaps: overlapsByTaxonomy.get(taxonomyKey) ?? [] })}`);
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
