import { Prisma, OrganizationExclusion } from "../db/core";
import { prismaCore } from "../db/postgres";

export const organizationExclusionRepository = {
  async findMany(params: Prisma.OrganizationExclusionFindManyArgs = {}): Promise<OrganizationExclusion[]> {
    return prismaCore.organizationExclusion.findMany(params);
  },

  async findFirst(params: Prisma.OrganizationExclusionFindFirstArgs): Promise<OrganizationExclusion | null> {
    return prismaCore.organizationExclusion.findFirst(params);
  },

  async findUnique(params: Prisma.OrganizationExclusionFindUniqueArgs): Promise<OrganizationExclusion | null> {
    return prismaCore.organizationExclusion.findUnique(params);
  },

  async count(params: Prisma.OrganizationExclusionCountArgs = {}): Promise<number> {
    return prismaCore.organizationExclusion.count(params);
  },

  async create(params: Prisma.OrganizationExclusionCreateArgs): Promise<OrganizationExclusion> {
    return prismaCore.organizationExclusion.create(params);
  },

  async createMany(params: Prisma.OrganizationExclusionCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.organizationExclusion.createMany(params);
  },

  async update(params: Prisma.OrganizationExclusionUpdateArgs): Promise<OrganizationExclusion> {
    return prismaCore.organizationExclusion.update(params);
  },

  async updateMany(params: Prisma.OrganizationExclusionUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.organizationExclusion.updateMany(params);
  },

  async deleteMany(params: Prisma.OrganizationExclusionDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.organizationExclusion.deleteMany(params);
  },
};

