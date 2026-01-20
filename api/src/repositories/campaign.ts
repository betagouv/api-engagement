import { Campaign, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";

export const campaignRepository = {
  async findMany(params: Prisma.CampaignFindManyArgs = {}): Promise<Campaign[]> {
    return prismaCore.campaign.findMany(params);
  },

  async findFirst(params: Prisma.CampaignFindFirstArgs): Promise<Campaign | null> {
    return prismaCore.campaign.findFirst(params);
  },

  async findUnique(params: Prisma.CampaignFindUniqueArgs): Promise<Campaign | null> {
    return prismaCore.campaign.findUnique(params);
  },

  async count(params: Prisma.CampaignCountArgs = {}): Promise<number> {
    return prismaCore.campaign.count(params);
  },

  async create(params: Prisma.CampaignCreateArgs): Promise<Campaign> {
    return prismaCore.campaign.create(params);
  },

  async update(params: Prisma.CampaignUpdateArgs): Promise<Campaign> {
    return prismaCore.campaign.update(params);
  },

  async updateMany(params: Prisma.CampaignUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.campaign.updateMany(params);
  },

  async deleteMany(params: Prisma.CampaignDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.campaign.deleteMany(params);
  },
};
