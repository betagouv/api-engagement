import { MissionMatchingResult, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import type { MatchingEngineVersion, MissionMatchingResultItem } from "@/services/matching-engine/types";

export type MissionMatchingEmailMission = {
  missionScoringId: string;
  mission: {
    id: string;
    title: string;
    duration: number | null;
    startAt: Date | null;
    endAt: Date | null;
    compensationAmount: number | null;
    compensationAmountMax: number | null;
    compensationUnit: string | null;
    publisherLogo: string | null;
    publisherName: string | null;
    publisherOrganizationName: string | null;
    city: string | null;
  };
};

const isUniqueConstraintError = (error: unknown): error is { code: string } => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

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

  findLatestForUserScoring(userScoringId: string): Promise<Pick<MissionMatchingResult, "id" | "results"> | null> {
    return prisma.missionMatchingResult.findFirst({
      where: { userScoringId },
      orderBy: { createdAt: "desc" },
      select: { id: true, results: true },
    });
  },

  async findMissionsByScoringIds(missionScoringIds: string[]): Promise<MissionMatchingEmailMission[]> {
    const missionScorings = await prisma.missionScoring.findMany({
      where: { id: { in: missionScoringIds } },
      select: {
        id: true,
        mission: {
          select: {
            id: true,
            title: true,
            duration: true,
            startAt: true,
            endAt: true,
            compensationAmount: true,
            compensationAmountMax: true,
            compensationUnit: true,
            publisher: { select: { logo: true, name: true } },
            publisherOrganization: { select: { name: true } },
            addresses: {
              select: { city: true },
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    return missionScorings.map((missionScoring) => ({
      missionScoringId: missionScoring.id,
      mission: {
        id: missionScoring.mission.id,
        title: missionScoring.mission.title,
        duration: missionScoring.mission.duration,
        startAt: missionScoring.mission.startAt,
        endAt: missionScoring.mission.endAt,
        compensationAmount: missionScoring.mission.compensationAmount,
        compensationAmountMax: missionScoring.mission.compensationAmountMax,
        compensationUnit: missionScoring.mission.compensationUnit,
        publisherLogo: missionScoring.mission.publisher?.logo ?? null,
        publisherName: missionScoring.mission.publisher?.name ?? null,
        publisherOrganizationName: missionScoring.mission.publisherOrganization?.name ?? null,
        city: missionScoring.mission.addresses[0]?.city ?? null,
      },
    }));
  },
};

export default missionMatchingResultRepository;
