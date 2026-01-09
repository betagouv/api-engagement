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
};

export default missionModerationStatusRepository;
