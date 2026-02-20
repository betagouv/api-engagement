import { Prisma, User } from "../db/core";
import { prisma } from "../db/postgres";

export const userRepository = {
  async findMany(params: Prisma.UserFindManyArgs = {}): Promise<User[]> {
    return prisma.user.findMany(params);
  },

  async findUnique(params: Prisma.UserFindUniqueArgs): Promise<User | null> {
    return prisma.user.findUnique(params);
  },

  async findFirst(params: Prisma.UserFindFirstArgs): Promise<User | null> {
    return prisma.user.findFirst(params);
  },

  async create(params: Prisma.UserCreateArgs): Promise<User> {
    return prisma.user.create(params);
  },

  async update(params: Prisma.UserUpdateArgs): Promise<User> {
    return prisma.user.update(params);
  },

  async updateMany(params: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.user.updateMany(params);
  },
};
