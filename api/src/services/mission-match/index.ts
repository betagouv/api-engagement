import type { MissionMatchResponse } from "@engagement/dto";

import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { buildMissionIndex, buildValuesIndex, toMissionMatchItem } from "./transformers";

export type MissionMatchInput = {
  userScoringId: string;
  limit: number;
  offset: number;
};

export const missionMatchService = {
  async getMatchedMissions(input: MissionMatchInput): Promise<MissionMatchResponse> {
    const result = await matchingEngineService.rankMissionsByUserScoring(input);

    if (result.items.length === 0) {
      return { tookMs: result.tookMs, items: [] };
    }

    const missionIds = result.items.map((item) => item.missionId);
    const missionScoringIds = result.items.map((item) => item.missionScoringId);

    const [missionRows, scoringValueRows] = await Promise.all([
      prisma.mission.findMany({
        where: { id: { in: missionIds } },
        select: {
          id: true,
          title: true,
          remote: true,
          schedule: true,
          domainOriginal: true,
          domainLogo: true,
          domain: { select: { name: true } },
          publisher: { select: { name: true, logo: true, defaultMissionLogo: true } },
          publisherOrganization: { select: { name: true, logo: true } },
          addresses: {
            select: { city: true },
            take: 1,
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.missionScoringValue.findMany({
        where: { missionScoringId: { in: missionScoringIds } },
        select: {
          missionScoringId: true,
          taxonomyKey: true,
          valueKey: true,
          score: true,
          taxonomyValue: {
            select: {
              key: true,
              label: true,
              taxonomy: { select: { key: true } },
            },
          },
          missionEnrichmentValue: {
            select: {
              confidence: true,
              evidence: true,
            },
          },
        },
      }),
    ]);

    const missionIndex = buildMissionIndex(missionRows);
    const valuesIndex = buildValuesIndex(scoringValueRows);

    return {
      tookMs: result.tookMs,
      items: result.items.map((item) => toMissionMatchItem(item, missionIndex, valuesIndex)),
    };
  },
};
