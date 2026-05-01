import { MissionMatchingResult, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import type { MatchingEngineVersion, MissionMatchingResultItem } from "@/services/matching-engine/types";

const isUniqueConstraintError = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export const missionMatchingResultRepository = {
  async createForUserScoringVersion(params: {
    userScoringId: string;
    matchingEngineVersion: MatchingEngineVersion;
    results: MissionMatchingResultItem[];
  }): Promise<MissionMatchingResult> {
    try {
      return await prisma.missionMatchingResult.create({
        data: {
          userScoringId: params.userScoringId,
          matchingEngineVersion: params.matchingEngineVersion,
          results: params.results as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existingResult = await prisma.missionMatchingResult.findUnique({
        where: {
          userScoringId_matchingEngineVersion: {
            userScoringId: params.userScoringId,
            matchingEngineVersion: params.matchingEngineVersion,
          },
        },
      });

      if (!existingResult) {
        throw error;
      }

      return existingResult;
    }
  },
};

export default missionMatchingResultRepository;
