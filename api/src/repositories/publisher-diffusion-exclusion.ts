import { Prisma, PublisherDiffusionExclusion } from "@/db/core";
import { prismaCore } from "@/db/postgres";

export const publisherDiffusionExclusionRepository = {
  async findMany(params: Prisma.PublisherDiffusionExclusionFindManyArgs = {}): Promise<PublisherDiffusionExclusion[]> {
    return prismaCore.publisherDiffusionExclusion.findMany(params);
  },

  async findFirst(params: Prisma.PublisherDiffusionExclusionFindFirstArgs): Promise<PublisherDiffusionExclusion | null> {
    return prismaCore.publisherDiffusionExclusion.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherDiffusionExclusionFindUniqueArgs): Promise<PublisherDiffusionExclusion | null> {
    return prismaCore.publisherDiffusionExclusion.findUnique(params);
  },

  async count(params: Prisma.PublisherDiffusionExclusionCountArgs = {}): Promise<number> {
    return prismaCore.publisherDiffusionExclusion.count(params);
  },

  async create(params: Prisma.PublisherDiffusionExclusionCreateArgs): Promise<PublisherDiffusionExclusion> {
    return prismaCore.publisherDiffusionExclusion.create(params);
  },

  async createMany(params: Prisma.PublisherDiffusionExclusionCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.publisherDiffusionExclusion.createMany(params);
  },

  async update(params: Prisma.PublisherDiffusionExclusionUpdateArgs): Promise<PublisherDiffusionExclusion> {
    return prismaCore.publisherDiffusionExclusion.update(params);
  },

  async updateMany(params: Prisma.PublisherDiffusionExclusionUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.publisherDiffusionExclusion.updateMany(params);
  },

  async deleteMany(params: Prisma.PublisherDiffusionExclusionDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.publisherDiffusionExclusion.deleteMany(params);
  },
};
