import { Email, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const emailRepository = {
  async find(params: Prisma.EmailFindManyArgs = {}): Promise<Email[]> {
    return prismaCore.email.findMany(params);
  },

  async findById(id: string): Promise<Email | null> {
    return prismaCore.email.findUnique({ where: { id } });
  },

  async create(data: Prisma.EmailCreateInput): Promise<Email> {
    return await prismaCore.email.create({
      data,
    });
  },

  async update(id: string, patch: Prisma.EmailUpdateInput): Promise<Email> {
    return await prismaCore.email.update({ where: { id }, data: patch });
  },
};
