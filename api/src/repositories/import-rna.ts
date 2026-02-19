import { ImportRna, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const importRnaRepository = {
  async find(params: Prisma.ImportRnaFindManyArgs = {}): Promise<ImportRna[]> {
    return prisma.importRna.findMany(params);
  },

  async findFirst(params: Prisma.ImportRnaFindFirstArgs): Promise<ImportRna | null> {
    return prisma.importRna.findFirst(params);
  },

  async findById(id: string): Promise<ImportRna | null> {
    return prisma.importRna.findUnique({ where: { id } });
  },

  async create(data: Prisma.ImportRnaCreateInput): Promise<ImportRna> {
    return prisma.importRna.create({ data });
  },

  async update(id: string, patch: Prisma.ImportRnaUpdateInput): Promise<ImportRna> {
    return prisma.importRna.update({ where: { id }, data: patch });
  },
};
