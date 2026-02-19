import { Prisma, PublisherDiffusionExclusion } from "../db/core";
import { prisma } from "../db/postgres";

export const publisherDiffusionExclusionRepository = {
  async findMany(params: Prisma.PublisherDiffusionExclusionFindManyArgs = {}): Promise<PublisherDiffusionExclusion[]> {
    return prisma.publisherDiffusionExclusion.findMany(params);
  },

  async findFirst(params: Prisma.PublisherDiffusionExclusionFindFirstArgs): Promise<PublisherDiffusionExclusion | null> {
    return prisma.publisherDiffusionExclusion.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherDiffusionExclusionFindUniqueArgs): Promise<PublisherDiffusionExclusion | null> {
    return prisma.publisherDiffusionExclusion.findUnique(params);
  },

  async count(params: Prisma.PublisherDiffusionExclusionCountArgs = {}): Promise<number> {
    return prisma.publisherDiffusionExclusion.count(params);
  },

  async create(params: Prisma.PublisherDiffusionExclusionCreateArgs): Promise<PublisherDiffusionExclusion> {
    return prisma.publisherDiffusionExclusion.create(params);
  },

  async createMany(params: Prisma.PublisherDiffusionExclusionCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.publisherDiffusionExclusion.createMany(params);
  },

  async update(params: Prisma.PublisherDiffusionExclusionUpdateArgs): Promise<PublisherDiffusionExclusion> {
    return prisma.publisherDiffusionExclusion.update(params);
  },

  async updateMany(params: Prisma.PublisherDiffusionExclusionUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.publisherDiffusionExclusion.updateMany(params);
  },

  async deleteMany(params: Prisma.PublisherDiffusionExclusionDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.publisherDiffusionExclusion.deleteMany(params);
  },
};
