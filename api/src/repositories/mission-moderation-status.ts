import { MissionModerationStatus, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionModerationStatusRepository = {
  findUnique(params: Prisma.MissionModerationStatusFindUniqueArgs): Promise<MissionModerationStatus | null> {
    return prismaCore.missionModerationStatus.findUnique({
      ...params,
      include: params.include ?? undefined,
    });
  },

  findMany(params: Prisma.MissionModerationStatusFindManyArgs = {}): Promise<MissionModerationStatus[]> {
    return prismaCore.missionModerationStatus.findMany({
      ...params,
      include: params.include ?? undefined,
    });
  },

  update(params: Prisma.MissionModerationStatusUpdateArgs): Promise<MissionModerationStatus> {
    return prismaCore.missionModerationStatus.update({
      ...params,
      include: params.include ?? undefined,
    });
  },

  count(where: Prisma.MissionModerationStatusWhereInput = {}): Promise<number> {
    return prismaCore.missionModerationStatus.count({ where });
  },

  groupBy<K extends keyof MissionModerationStatus>(by: K[], where: Prisma.MissionModerationStatusWhereInput) {
    return prismaCore.missionModerationStatus.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};

export default missionModerationStatusRepository;
