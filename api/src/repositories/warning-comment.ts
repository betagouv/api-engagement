import { Prisma, WarningComment } from "@/db/core";
import { prisma } from "@/db/postgres";

export const warningCommentRepository = {
  async findMany(params: Prisma.WarningCommentFindManyArgs): Promise<WarningComment[]> {
    return prisma.warningComment.findMany(params);
  },

  async findUnique(params: Prisma.WarningCommentFindUniqueArgs): Promise<WarningComment | null> {
    return prisma.warningComment.findUnique(params);
  },

  async create(params: Prisma.WarningCommentCreateArgs): Promise<WarningComment> {
    return prisma.warningComment.create(params);
  },

  async update(params: Prisma.WarningCommentUpdateArgs): Promise<WarningComment> {
    return prisma.warningComment.update(params);
  },
};
