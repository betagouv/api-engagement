import { MissionModerationStatus, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionModerationStatusRepository = {
  upsert(where: Prisma.MissionModerationStatusWhereUniqueInput, data: Prisma.MissionModerationStatusCreateInput): Promise<MissionModerationStatus> {
    return prismaCore.missionModerationStatus.upsert({
      where,
      update: data,
      create: data,
    });
  },
};

export default missionModerationStatusRepository;
