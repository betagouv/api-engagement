import { Mission, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const missionRepository = {
  async findMany(params: Prisma.MissionFindManyArgs = {}): Promise<Mission[]> {
    return prismaCore.mission.findMany(params);
  },

  async count(where: Prisma.MissionWhereInput = {}): Promise<number> {
    return prismaCore.mission.count({ where });
  },

  async findById(id: string): Promise<Mission | null> {
    return prismaCore.mission.findUnique({ where: { id } });
  },

  async findFirst(params: Prisma.MissionFindFirstArgs): Promise<Mission | null> {
    return prismaCore.mission.findFirst(params);
  },

  async create(data: Prisma.MissionCreateInput): Promise<Mission> {
    return prismaCore.mission.create({ data });
  },

  async createUnchecked(data: Prisma.MissionUncheckedCreateInput): Promise<Mission> {
    return prismaCore.mission.create({ data });
  },

  async update(id: string, data: Prisma.MissionUpdateInput): Promise<Mission> {
    return prismaCore.mission.update({ where: { id }, data });
  },

  async updateUnchecked(id: string, data: Prisma.MissionUncheckedUpdateInput): Promise<Mission> {
    return prismaCore.mission.update({ where: { id }, data });
  },

  groupBy<K extends keyof Mission>(by: K[], where: Prisma.MissionWhereInput) {
    return prismaCore.mission.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};

export default missionRepository;
