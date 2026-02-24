import { Prisma, Warning } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const warningRepository = {
  async findMany(params: Prisma.WarningFindManyArgs = {}): Promise<Warning[]> {
    return prismaCore.warning.findMany(params);
  },

  async findFirst(params: Prisma.WarningFindFirstArgs): Promise<Warning | null> {
    return prismaCore.warning.findFirst(params);
  },

  async findUnique(params: Prisma.WarningFindUniqueArgs): Promise<Warning | null> {
    return prismaCore.warning.findUnique(params);
  },

  async count(params: Prisma.WarningCountArgs = {}): Promise<number> {
    return prismaCore.warning.count(params);
  },

  async create(params: Prisma.WarningCreateArgs): Promise<Warning> {
    return prismaCore.warning.create(params);
  },

  async update(params: Prisma.WarningUpdateArgs): Promise<Warning> {
    return prismaCore.warning.update(params);
  },

  async updateMany(params: Prisma.WarningUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.warning.updateMany(params);
  },

  async delete(params: Prisma.WarningDeleteArgs): Promise<Warning> {
    return prismaCore.warning.delete(params);
  },

  async deleteMany(params: Prisma.WarningDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.warning.deleteMany(params);
  },
};
