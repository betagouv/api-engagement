import { LoginHistory, Prisma } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const loginHistoryRepository = {
  async findMany(params: Prisma.LoginHistoryFindManyArgs = {}): Promise<LoginHistory[]> {
    return prismaCore.loginHistory.findMany(params);
  },

  async create(params: Prisma.LoginHistoryCreateArgs): Promise<LoginHistory> {
    return prismaCore.loginHistory.create(params);
  },

  async createMany(params: Prisma.LoginHistoryCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.loginHistory.createMany(params);
  },

  async deleteMany(params: Prisma.LoginHistoryDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.loginHistory.deleteMany(params);
  },
};
