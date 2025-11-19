import { Prisma, User } from "../db/core";
import { prismaCore } from "../db/postgres";

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

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prismaCore.user.create({ data });
  },

  async update(where: Prisma.UserWhereUniqueInput, data: Prisma.UserUpdateInput): Promise<User> {
    return prismaCore.user.update({ where, data });
  },

  async updateMany(params: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.user.updateMany(params);
  },
};
