import type { MissionMatchResponse } from "@engagement/dto";

import { prisma } from "@/db/postgres";
import { matchingEngineService } from "@/services/matching-engine";
import { MATCHING_ENGINE_VERSIONS } from "@/services/matching-engine/config";
import type { MatchingEngineVersion } from "@/services/matching-engine/types";
import { buildMissionIndex, buildValuesIndex, missionMatchMissionSelect, missionMatchScoringValueSelect, toMissionMatchItem } from "./transformers";

export type MissionMatchInput = {
  userScoringId: string;
  publisherId: string;
  version?: MatchingEngineVersion;
  limit: number;
  offset: number;
};

export const missionMatchService = {
  async getMatchedMissions(input: MissionMatchInput): Promise<MissionMatchResponse> {
    const result = await matchingEngineService.rankMissionsByUserScoring(input);

    if (result.items.length === 0) {
      return { tookMs: result.tookMs, engineVersion: result.version, items: [], total: result.total, avgDistanceKmTop5: result.avgDistanceKmTop5 };
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
    // La version active ignore-t-elle l'adresse des missions remote=full ? (aligné sur le moteur)
    const ignoreRemoteAddress = MATCHING_ENGINE_VERSIONS[result.version].remoteFullGeoScore != null;

    return {
      tookMs: result.tookMs,
      engineVersion: result.version,
      items: result.items.map((item) => toMissionMatchItem(item, missionIndex, valuesIndex, input.publisherId, ignoreRemoteAddress)),
      total: result.total,
      avgDistanceKmTop5: result.avgDistanceKmTop5,
    };
  },
};
