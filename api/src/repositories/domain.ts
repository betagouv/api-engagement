import { Domain, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const domainRepository = {
  async findMany(params: Prisma.DomainFindManyArgs = {}): Promise<Domain[]> {
    return prismaCore.domain.findMany(params);
  },
};
