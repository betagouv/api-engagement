import { MissionMatchingResult, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import type { MatchingEngineVersion, MissionMatchingResultItem } from "@/services/matching-engine/types";

export const missionMatchingResultRepository = {
  async createForUserScoringVersion(params: {
    userScoringId: string;
    matchingEngineVersion: MatchingEngineVersion;
    results: MissionMatchingResultItem[];
  }): Promise<MissionMatchingResult> {
    return prisma.missionMatchingResult.create({
      data: {
        userScoringId: params.userScoringId,
        matchingEngineVersion: params.matchingEngineVersion,
        results: params.results as Prisma.InputJsonValue,
      },
    });
  },
};

export default missionMatchingResultRepository;
