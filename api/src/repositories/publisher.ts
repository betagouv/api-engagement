import { Prisma, Publisher } from "../db/core";
import { prisma } from "../db/postgres";

export const publisherRepository = {
  async findMany(params: Prisma.PublisherFindManyArgs = {}): Promise<Publisher[]> {
    return prisma.publisher.findMany(params);
  },
  async findExistingIds(ids: string[]): Promise<string[]> {
    if (!ids.length) {
      return [];
    }
    const rows = await prisma.publisher.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findFirst(params: Prisma.PublisherFindFirstArgs): Promise<Publisher | null> {
    return prisma.publisher.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherFindUniqueArgs): Promise<Publisher | null> {
    return prisma.publisher.findUnique(params);
  },

  async count(params: Prisma.PublisherCountArgs = {}): Promise<number> {
    return prisma.publisher.count(params);
  },

  async create(params: Prisma.PublisherCreateArgs): Promise<Publisher> {
    return prisma.publisher.create(params);
  },

  async update(params: Prisma.PublisherUpdateArgs): Promise<Publisher> {
    return prisma.publisher.update(params);
  },

  async updateMany(params: Prisma.PublisherUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.publisher.updateMany(params);
  },

  async delete(params: Prisma.PublisherDeleteArgs): Promise<Publisher> {
    return prisma.publisher.delete(params);
  },

  async deleteMany(params: Prisma.PublisherDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.publisher.deleteMany(params);
  },
};
