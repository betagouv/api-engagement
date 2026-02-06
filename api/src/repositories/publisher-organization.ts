import { Prisma, PublisherOrganization } from "../db/core";
import { prismaCore } from "../db/postgres";
import { PublisherOrganizationWithRelations } from "../types/publisher-organization";

export const publisherOrganizationRepository = {
  async findMany(params: Prisma.PublisherOrganizationFindManyArgs = {}): Promise<PublisherOrganization[]> {
    return prismaCore.publisherOrganization.findMany(params);
  },

  async findFirst(params: Prisma.PublisherOrganizationFindFirstArgs): Promise<PublisherOrganization | null> {
    return prismaCore.publisherOrganization.findFirst(params);
  },

  async create(params: Prisma.PublisherOrganizationCreateInput): Promise<PublisherOrganization> {
    return prismaCore.publisherOrganization.create({
      data: params,
    });
  },

  async update(id: string, params: Prisma.PublisherOrganizationUpdateInput, options = {}): Promise<PublisherOrganization | PublisherOrganizationWithRelations> {
    return prismaCore.publisherOrganization.update({
      where: { id },
      data: params,
      ...options,
    });
  },

  groupBy<K extends keyof PublisherOrganization>(by: K[], where: Prisma.PublisherOrganizationWhereInput) {
    return prismaCore.publisherOrganization.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },

  async count(params: Prisma.PublisherOrganizationCountArgs = {}): Promise<number> {
    return prismaCore.publisherOrganization.count(params);
  },
};
export default publisherOrganizationRepository;
