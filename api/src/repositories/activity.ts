import { Activity, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const activityRepository = {
  async findMany(params: Prisma.ActivityFindManyArgs = {}): Promise<Activity[]> {
    return prismaCore.activity.findMany(params);
  },

  async findUnique(params: Prisma.ActivityFindUniqueArgs): Promise<Activity | null> {
    return prismaCore.activity.findUnique(params);
  },

  async create(data: Prisma.ActivityCreateInput): Promise<Activity> {
    return prismaCore.activity.create({ data });
  },
};
