import { Email, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const emailRepository = {
  async find(params: Prisma.EmailFindManyArgs = {}): Promise<Email[]> {
    return prisma.email.findMany(params);
  },

  async findById(id: string): Promise<Email | null> {
    return prisma.email.findUnique({ where: { id } });
  },

  async create(data: Prisma.EmailCreateInput): Promise<Email> {
    return await prisma.email.create({
      data,
    });
  },

  async update(id: string, patch: Prisma.EmailUpdateInput): Promise<Email> {
    return await prisma.email.update({ where: { id }, data: patch });
  },
};
