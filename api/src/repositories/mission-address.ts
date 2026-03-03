import { MissionAddress, Prisma } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const missionAddressRepository = {
  async findMany(params: Prisma.MissionAddressFindManyArgs = {}): Promise<MissionAddress[]> {
    return prismaCore.missionAddress.findMany(params);
  },

  async update(id: string, data: Prisma.MissionAddressUpdateInput): Promise<MissionAddress> {
    return prismaCore.missionAddress.update({ where: { id }, data });
  },

  groupBy<K extends keyof MissionAddress>(by: K[], where: Prisma.MissionAddressWhereInput) {
    return prismaCore.missionAddress.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
