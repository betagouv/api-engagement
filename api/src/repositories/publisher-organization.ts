import { Prisma, PublisherOrganization } from "../db/core";
import { prismaCore } from "../db/postgres";

export const publisherOrganizationRepository = {
  async findMany(params: Prisma.PublisherOrganizationFindManyArgs = {}): Promise<PublisherOrganization[]> {
    return prismaCore.publisherOrganization.findMany(params);
  },

  async findFirst(params: Prisma.PublisherOrganizationFindFirstArgs): Promise<PublisherOrganization | null> {
    return prismaCore.publisherOrganization.findFirst(params);
  },

  async upsertByPublisherAndClientId(params: {
    publisherId: string;
    organizationClientId: string;
    create: Prisma.PublisherOrganizationCreateInput;
    update: Prisma.PublisherOrganizationUpdateInput;
  }): Promise<PublisherOrganization> {
    return prismaCore.publisherOrganization.upsert({
      where: {
        publisherId_organizationClientId: {
          publisherId: params.publisherId,
          organizationClientId: params.organizationClientId,
        },
      },
      create: params.create,
      update: params.update,
    });
  },
};

export default publisherOrganizationRepository;
