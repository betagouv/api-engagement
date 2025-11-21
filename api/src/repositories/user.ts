import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const userRepository = {
  async findMany<T extends Prisma.UserFindManyArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>
  ): Promise<Prisma.UserGetPayload<T>[]> {
    return prismaCore.user.findMany(params);
  },

  async findUnique<T extends Prisma.UserFindUniqueArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>
  ): Promise<Prisma.UserGetPayload<T> | null> {
    return prismaCore.user.findUnique(params);
  },

  async findFirst<T extends Prisma.UserFindFirstArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>
  ): Promise<Prisma.UserGetPayload<T> | null> {
    return prismaCore.user.findFirst(params);
  },

  async create<T extends Prisma.UserCreateArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserCreateArgs>
  ): Promise<Prisma.UserGetPayload<T>> {
    return prismaCore.user.create(params);
  },

  async update<T extends Prisma.UserUpdateArgs>(
    params: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>
  ): Promise<Prisma.UserGetPayload<T>> {
    return prismaCore.user.update(params);
  },

  async updateMany(params: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.user.updateMany(params);
  },
};
