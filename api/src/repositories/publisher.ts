import { Prisma, Publisher } from "../db/core";
import { prismaCore } from "../db/postgres";

export const publisherRepository = {
  async findMany(params: Prisma.PublisherFindManyArgs = {}): Promise<Publisher[]> {
    return prismaCore.publisher.findMany(params);
  },
  async findExistingIds(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await prismaCore.publisher.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findFirst(params: Prisma.PublisherFindFirstArgs): Promise<Publisher | null> {
    return prismaCore.publisher.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherFindUniqueArgs): Promise<Publisher | null> {
    return prismaCore.publisher.findUnique(params);
  },

  async count(params: Prisma.PublisherCountArgs = {}): Promise<number> {
    return prismaCore.publisher.count(params);
  },

  async create(params: Prisma.PublisherCreateArgs): Promise<Publisher> {
    return prismaCore.publisher.create(params);
  },

  async update(params: Prisma.PublisherUpdateArgs): Promise<Publisher> {
    return prismaCore.publisher.update(params);
  },

  async updateMany(params: Prisma.PublisherUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.publisher.updateMany(params);
  },

  async delete(params: Prisma.PublisherDeleteArgs): Promise<Publisher> {
    return prismaCore.publisher.delete(params);
  },

  async deleteMany(params: Prisma.PublisherDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.publisher.deleteMany(params);
  },
};
