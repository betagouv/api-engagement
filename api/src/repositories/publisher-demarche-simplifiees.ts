import { Prisma, PublisherDemarcheSimplifiee } from "@/db/core";
import { prisma } from "@/db/postgres";

export type PublisherDemarcheSimplifieeWithFields = Prisma.PublisherDemarcheSimplifieeGetPayload<{ include: { fields: true } }>;

export const publisherDemarcheSimplifieesRepository = {
  // Les champs qualifiés sont toujours chargés avec la démarche.
  async findMany(params: Omit<Prisma.PublisherDemarcheSimplifieeFindManyArgs, "include" | "select"> = {}): Promise<PublisherDemarcheSimplifieeWithFields[]> {
    return prisma.publisherDemarcheSimplifiee.findMany({ ...params, include: { fields: true } });
  },

  async findFirst(params: Prisma.PublisherDemarcheSimplifieeFindFirstArgs): Promise<PublisherDemarcheSimplifiee | null> {
    return prisma.publisherDemarcheSimplifiee.findFirst(params);
  },
};
