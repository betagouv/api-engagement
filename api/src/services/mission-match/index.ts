import type { MissionMatchResponse } from "@engagement/dto";

import { prisma } from "@/db/postgres";
import { missionMatchingResultRepository } from "@/repositories/mission-matching-result";
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
    // On fige le moteur sur la version qui a scoré ce scoring en premier (snapshot le plus ancien),
    // sinon un ancien scoring serait re-classé avec la version courante et ses résultats changeraient.
    // Un override explicite (input.version) reste prioritaire ; sans snapshot, le moteur retombe sur la version courante.
    const version = input.version ?? (await missionMatchingResultRepository.findEarliestVersion(input.userScoringId)) ?? undefined;
    const result = await matchingEngineService.rankMissionsByUserScoring({ ...input, version });

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
    // La version active ignore-t-elle l'adresse des missions remote=full/local ? (aligné sur le moteur)
    const ignoreRemoteAddress = MATCHING_ENGINE_VERSIONS[result.version].remoteFullGeoScore != null || MATCHING_ENGINE_VERSIONS[result.version].remoteLocalGeoScore != null;

    return {
      tookMs: result.tookMs,
      engineVersion: result.version,
      items: result.items.map((item) => toMissionMatchItem(item, missionIndex, valuesIndex, input.publisherId, ignoreRemoteAddress)),
      total: result.total,
      avgDistanceKmTop5: result.avgDistanceKmTop5,
    };
  },
};
