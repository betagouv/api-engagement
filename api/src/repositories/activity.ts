import { Activity, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const activityRepository = {
  async findMany(params: Prisma.ActivityFindManyArgs = {}): Promise<Activity[]> {
    return prisma.activity.findMany(params);
  },

  async findUnique(params: Prisma.ActivityFindUniqueArgs): Promise<Activity | null> {
    return prisma.activity.findUnique(params);
  },

  async create(data: Prisma.ActivityCreateInput): Promise<Activity> {
    return prisma.activity.create({ data });
  },
};
