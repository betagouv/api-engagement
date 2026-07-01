import { Prisma, PublisherDemarcheSimplifiee } from "@/db/core";
import { prisma } from "@/db/postgres";

export const publisherDemarcheSimplifieesRepository = {
  async findMany(params: Prisma.PublisherDemarcheSimplifieeFindManyArgs = {}): Promise<PublisherDemarcheSimplifiee[]> {
    return prisma.publisherDemarcheSimplifiee.findMany(params);
  },

  async findFirst(params: Prisma.PublisherDemarcheSimplifieeFindFirstArgs): Promise<PublisherDemarcheSimplifiee | null> {
    return prisma.publisherDemarcheSimplifiee.findFirst(params);
  },
};
