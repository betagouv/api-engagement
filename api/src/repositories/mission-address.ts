import { MissionAddress, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const missionAddressRepository = {
  async findMany(params: Prisma.MissionAddressFindManyArgs = {}): Promise<MissionAddress[]> {
    return prisma.missionAddress.findMany(params);
  },

  async update(id: string, data: Prisma.MissionAddressUpdateInput): Promise<MissionAddress> {
    return prisma.missionAddress.update({ where: { id }, data });
  },

  groupBy<K extends keyof MissionAddress>(by: K[], where: Prisma.MissionAddressWhereInput) {
    return prisma.missionAddress.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
