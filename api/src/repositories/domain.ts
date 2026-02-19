import { Domain, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const domainRepository = {
  async findMany(params: Prisma.DomainFindManyArgs = {}): Promise<Domain[]> {
    return prisma.domain.findMany(params);
  },
};
