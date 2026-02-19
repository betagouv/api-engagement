import { Prisma, Warning } from "../db/core";
import { prisma } from "../db/postgres";

export const warningRepository = {
  async findMany(params: Prisma.WarningFindManyArgs = {}): Promise<Warning[]> {
    return prisma.warning.findMany(params);
  },

  async findFirst(params: Prisma.WarningFindFirstArgs): Promise<Warning | null> {
    return prisma.warning.findFirst(params);
  },

  async findUnique(params: Prisma.WarningFindUniqueArgs): Promise<Warning | null> {
    return prisma.warning.findUnique(params);
  },

  async count(params: Prisma.WarningCountArgs = {}): Promise<number> {
    return prisma.warning.count(params);
  },

  async create(params: Prisma.WarningCreateArgs): Promise<Warning> {
    return prisma.warning.create(params);
  },

  async update(params: Prisma.WarningUpdateArgs): Promise<Warning> {
    return prisma.warning.update(params);
  },

  async updateMany(params: Prisma.WarningUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.warning.updateMany(params);
  },

  async delete(params: Prisma.WarningDeleteArgs): Promise<Warning> {
    return prisma.warning.delete(params);
  },

  async deleteMany(params: Prisma.WarningDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.warning.deleteMany(params);
  },
};
