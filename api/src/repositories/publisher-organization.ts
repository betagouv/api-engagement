import { randomUUID } from "node:crypto";

import { Prisma, PublisherOrganization } from "../db/core";
import { prisma } from "../db/postgres";

export const publisherOrganizationRepository = {
  async findMany(params: Prisma.PublisherOrganizationFindManyArgs = {}): Promise<PublisherOrganization[]> {
    return prisma.publisherOrganization.findMany(params);
  },

  async findFirst(params: Prisma.PublisherOrganizationFindFirstArgs): Promise<PublisherOrganization | null> {
    return prisma.publisherOrganization.findFirst(params);
  },

  async upsertByPublisherAndClientId(params: {
    publisherId: string;
    organizationClientId: string;
    create: Prisma.PublisherOrganizationCreateInput;
    update: Prisma.PublisherOrganizationUpdateInput;
  }): Promise<PublisherOrganization> {
    const createInput = params.create.id ? params.create : { ...params.create, id: randomUUID() };
    return prisma.publisherOrganization.upsert({
      where: {
        publisherId_organizationClientId: {
          publisherId: params.publisherId,
          organizationClientId: params.organizationClientId,
        },
      },
      create: createInput,
      update: params.update,
    });
  },
  async updateByPublisherAndClientId(params: {
    publisherId: string;
    organizationClientId: string;
    update: Prisma.PublisherOrganizationUpdateInput;
  }): Promise<PublisherOrganization> {
    return prisma.publisherOrganization.update({
      where: {
        publisherId_organizationClientId: {
          publisherId: params.publisherId,
          organizationClientId: params.organizationClientId,
        },
      },
      data: params.update,
    });
  },
  groupBy<K extends keyof PublisherOrganization>(by: K[], where: Prisma.PublisherOrganizationWhereInput) {
    return prisma.publisherOrganization.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },
};
export default publisherOrganizationRepository;
