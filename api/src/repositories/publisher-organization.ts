import { randomUUID } from "node:crypto";

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
    const createInput = params.create.id ? params.create : { ...params.create, id: randomUUID() };
    return prismaCore.publisherOrganization.upsert({
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
};

export default publisherOrganizationRepository;
