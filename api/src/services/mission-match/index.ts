import type { MissionMatchResponse } from "@engagement/dto";

import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { buildMissionIndex, buildValuesIndex, missionMatchMissionSelect, missionMatchScoringValueSelect, toMissionMatchItem } from "./transformers";

export type MissionMatchInput = {
  userScoringId: string;
  publisherId: string;
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
        select: missionMatchMissionSelect,
      }),
      prisma.missionScoringValue.findMany({
        where: { missionScoringId: { in: missionScoringIds } },
        select: missionMatchScoringValueSelect,
      }),
    ]);

    const missionIndex = buildMissionIndex(missionRows);
    const valuesIndex = buildValuesIndex(scoringValueRows);

    return {
      tookMs: result.tookMs,
      items: result.items.map((item) => toMissionMatchItem(item, missionIndex, valuesIndex, input.publisherId)),
    };
  },
};
