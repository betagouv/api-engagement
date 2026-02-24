import { Prisma, User } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const userRepository = {
  async findMany(params: Prisma.UserFindManyArgs = {}): Promise<User[]> {
    return prismaCore.user.findMany(params);
  },

  async findUnique(params: Prisma.UserFindUniqueArgs): Promise<User | null> {
    return prismaCore.user.findUnique(params);
  },

  async findFirst(params: Prisma.UserFindFirstArgs): Promise<User | null> {
    return prismaCore.user.findFirst(params);
  },

  async create(params: Prisma.UserCreateArgs): Promise<User> {
    return prismaCore.user.create(params);
  },

  async update(params: Prisma.UserUpdateArgs): Promise<User> {
    return prismaCore.user.update(params);
  },

  async updateMany(params: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.user.updateMany(params);
  },
};
