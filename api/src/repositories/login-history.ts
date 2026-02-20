import { LoginHistory, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const loginHistoryRepository = {
  async findMany(params: Prisma.LoginHistoryFindManyArgs = {}): Promise<LoginHistory[]> {
    return prisma.loginHistory.findMany(params);
  },

  async create(params: Prisma.LoginHistoryCreateArgs): Promise<LoginHistory> {
    return prisma.loginHistory.create(params);
  },

  async createMany(params: Prisma.LoginHistoryCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.loginHistory.createMany(params);
  },

  async deleteMany(params: Prisma.LoginHistoryDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.loginHistory.deleteMany(params);
  },
};
