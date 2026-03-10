import { Prisma, PublisherOrganization } from "@/db/core";
import { prisma } from "@/db/postgres";
import { PublisherOrganizationWithRelations } from "@/types/publisher-organization";

export const publisherOrganizationRepository = {
  async findMany(params: Prisma.PublisherOrganizationFindManyArgs = {}): Promise<PublisherOrganization[]> {
    return prisma.publisherOrganization.findMany(params);
  },

  async findFirst(params: Prisma.PublisherOrganizationFindFirstArgs): Promise<PublisherOrganization | null> {
    return prisma.publisherOrganization.findFirst(params);
  },

  async create(params: Prisma.PublisherOrganizationCreateInput): Promise<PublisherOrganization> {
    return prisma.publisherOrganization.create({
      data: params,
    });
  },

  async update(id: string, params: Prisma.PublisherOrganizationUpdateInput, options = {}): Promise<PublisherOrganization | PublisherOrganizationWithRelations> {
    return prisma.publisherOrganization.update({
      where: { id },
      data: params,
      ...options,
    });
  },

  groupBy<K extends keyof PublisherOrganization>(by: K[], where: Prisma.PublisherOrganizationWhereInput) {
    return prisma.publisherOrganization.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },

  async count(params: Prisma.PublisherOrganizationCountArgs = {}): Promise<number> {
    return prisma.publisherOrganization.count(params);
  },
};
export default publisherOrganizationRepository;
