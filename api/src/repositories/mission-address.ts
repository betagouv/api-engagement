import { MissionAddress, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const missionAddressRepository = {
  async findMany(params: Prisma.MissionAddressFindManyArgs = {}): Promise<MissionAddress[]> {
    return prisma.missionAddress.findMany(params);
  },

  groupBy<K extends keyof MissionAddress>(by: K[], where: Prisma.MissionAddressWhereInput) {
    return prisma.missionAddress.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
