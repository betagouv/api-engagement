import { Import, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const importRepository = {
  async findMany(params: Prisma.ImportFindManyArgs = {}): Promise<Import[]> {
    return prismaCore.import.findMany(params);
  },

  async findFirst(params: Prisma.ImportFindFirstArgs): Promise<Import | null> {
    return prismaCore.import.findFirst(params);
  },

  async findUnique(params: Prisma.ImportFindUniqueArgs): Promise<Import | null> {
    return prismaCore.import.findUnique(params);
  },

  async count(params: Prisma.ImportCountArgs = {}): Promise<number> {
    return prismaCore.import.count(params);
  },

  async create(params: Prisma.ImportCreateArgs): Promise<Import> {
    return prismaCore.import.create(params);
  },

  async update(params: Prisma.ImportUpdateArgs): Promise<Import> {
    return prismaCore.import.update(params);
  },

  async updateMany(params: Prisma.ImportUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.import.updateMany(params);
  },

  async delete(params: Prisma.ImportDeleteArgs): Promise<Import> {
    return prismaCore.import.delete(params);
  },

  async deleteMany(params: Prisma.ImportDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.import.deleteMany(params);
  },

  // Helper: fetch most recent import per publisher
  async findLastPerPublisher(params?: { where?: Prisma.ImportWhereInput; includePublisher?: boolean }): Promise<Import[]> {
    const { where, includePublisher } = params ?? {};
    return prismaCore.import.findMany({
      where,
      orderBy: { startedAt: "desc" },
      distinct: ["publisherId"],
      include: includePublisher ? { publisher: true } : undefined,
    });
  },
};
