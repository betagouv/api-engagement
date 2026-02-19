import { Campaign, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const campaignRepository = {
  async findMany(params: Prisma.CampaignFindManyArgs = {}): Promise<Campaign[]> {
    return prisma.campaign.findMany(params);
  },

  async findFirst(params: Prisma.CampaignFindFirstArgs): Promise<Campaign | null> {
    return prisma.campaign.findFirst(params);
  },

  async findUnique(params: Prisma.CampaignFindUniqueArgs): Promise<Campaign | null> {
    return prisma.campaign.findUnique(params);
  },

  async count(params: Prisma.CampaignCountArgs = {}): Promise<number> {
    return prisma.campaign.count(params);
  },

  async create(params: Prisma.CampaignCreateArgs): Promise<Campaign> {
    return prisma.campaign.create(params);
  },

  async update(params: Prisma.CampaignUpdateArgs): Promise<Campaign> {
    return prisma.campaign.update(params);
  },

  async updateMany(params: Prisma.CampaignUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.campaign.updateMany(params);
  },

  async deleteMany(params: Prisma.CampaignDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.campaign.deleteMany(params);
  },
};
