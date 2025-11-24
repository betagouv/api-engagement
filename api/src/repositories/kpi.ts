import { Kpi, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const kpiRepository = {
  async find(params: Prisma.KpiFindManyArgs = {}): Promise<Kpi[]> {
    return prismaCore.kpi.findMany(params);
  },

  async findOne(params: Prisma.KpiFindUniqueArgs): Promise<Kpi | null> {
    return prismaCore.kpi.findUnique(params);
  },

  async create(data: Prisma.KpiCreateInput): Promise<Kpi> {
    return prismaCore.kpi.create({ data });
  },

  async update(where: Prisma.KpiWhereUniqueInput, data: Prisma.KpiUpdateInput): Promise<Kpi> {
    return prismaCore.kpi.update({ where, data });
  },
};
