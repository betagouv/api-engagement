import { ImportRna, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const importRnaRepository = {
  async find(params: Prisma.ImportRnaFindManyArgs = {}): Promise<ImportRna[]> {
    return prismaCore.importRna.findMany(params);
  },

  async findFirst(params: Prisma.ImportRnaFindFirstArgs): Promise<ImportRna | null> {
    return prismaCore.importRna.findFirst(params);
  },

  async findById(id: string): Promise<ImportRna | null> {
    return prismaCore.importRna.findUnique({ where: { id } });
  },

  async create(data: Prisma.ImportRnaCreateInput): Promise<ImportRna> {
    return prismaCore.importRna.create({ data });
  },

  async update(id: string, patch: Prisma.ImportRnaUpdateInput): Promise<ImportRna> {
    return prismaCore.importRna.update({ where: { id }, data: patch });
  },
};
