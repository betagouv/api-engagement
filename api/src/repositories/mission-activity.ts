import { MissionActivity, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const missionActivityRepository = {
  async createMany(data: Prisma.MissionActivityCreateManyInput[]): Promise<void> {
    await prisma.missionActivity.createMany({ data });
  },

  async deleteByMissionId(missionId: string): Promise<void> {
    await prisma.missionActivity.deleteMany({ where: { missionId } });
  },

  groupBy<K extends keyof MissionActivity>(by: K[], where: Prisma.MissionActivityWhereInput) {
    return prisma.missionActivity.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
