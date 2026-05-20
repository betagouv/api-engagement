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

const buildMissionMatchingResultItemsFromScoringIds = (missionScoringIds: string[]): MissionMatchingResultItem[] =>
  missionScoringIds.map((missionScoringId) => ({ missionScoringId, missionAddressId: null, taxonomyScores: {} }));

const findMissionsByMatchingResultItems = async (items: MissionMatchingResultItem[]): Promise<MissionMatchingEmailMission[]> => {
  if (items.length === 0) {
    return [];
  }

  const missionScoringIds = items.map((item) => item.missionScoringId);
  const itemsByMissionScoringId = new Map(items.map((item) => [item.missionScoringId, item]));
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
            select: { id: true, city: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  return missionScorings.map((missionScoring) => {
    const item = itemsByMissionScoringId.get(missionScoring.id);
    const matchedAddress = item?.missionAddressId ? missionScoring.mission.addresses.find((address) => address.id === item.missionAddressId) : null;
    const fallbackAddress = missionScoring.mission.addresses[0] ?? null;

    return {
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
        city: matchedAddress?.city ?? fallbackAddress?.city ?? null,
      },
    };
  });
};

export const missionMatchingResultRepository = {
  async createForUserScoringVersion(params: {
    userScoringId: string;
    matchingEngineVersion: MatchingEngineVersion;
    results: MissionMatchingResultItem[];
  }): Promise<MissionMatchingResult> {
    return prisma.missionMatchingResult.upsert({
      where: {
        userScoringId_matchingEngineVersion: {
          userScoringId: params.userScoringId,
          matchingEngineVersion: params.matchingEngineVersion,
        },
      },
      create: {
        userScoringId: params.userScoringId,
        matchingEngineVersion: params.matchingEngineVersion,
        results: params.results as Prisma.InputJsonValue,
      },
      update: {},
    });
  },

  findLatestForUserScoring(userScoringId: string): Promise<Pick<MissionMatchingResult, "id" | "results"> | null> {
    return prisma.missionMatchingResult.findFirst({
      where: { userScoringId },
      orderBy: { createdAt: "desc" },
      select: { id: true, results: true },
    });
  },

  findMissionsByMatchingResultItems,

  async findMissionsByScoringIds(missionScoringIds: string[]): Promise<MissionMatchingEmailMission[]> {
    return findMissionsByMatchingResultItems(buildMissionMatchingResultItemsFromScoringIds(missionScoringIds));
  },
};

export default missionMatchingResultRepository;
