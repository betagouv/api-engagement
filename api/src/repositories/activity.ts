import { Activity, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const activityRepository = {
  async findMany(params: Prisma.ActivityFindManyArgs = {}): Promise<Activity[]> {
    return prismaCore.activity.findMany(params);
  },
};
