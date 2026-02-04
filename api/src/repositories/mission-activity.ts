import { MissionActivity, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionActivityRepository = {
  async createMany(data: Prisma.MissionActivityCreateManyInput[]): Promise<void> {
    await prismaCore.missionActivity.createMany({ data });
  },

  async deleteByMissionId(missionId: string): Promise<void> {
    await prismaCore.missionActivity.deleteMany({ where: { missionId } });
  },

  groupBy<K extends keyof MissionActivity>(by: K[], where: Prisma.MissionActivityWhereInput) {
    return prismaCore.missionActivity.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
