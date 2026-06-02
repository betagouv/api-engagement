import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";

export const publisherDiffusionRuleRepository = {
  async findMany(params: Prisma.PublisherDiffusionRuleFindManyArgs = {}): Promise<PublisherDiffusionRule[]> {
    return prisma.publisherDiffusionRule.findMany(params);
  },

  async findFirst(params: Prisma.PublisherDiffusionRuleFindFirstArgs): Promise<PublisherDiffusionRule | null> {
    return prisma.publisherDiffusionRule.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherDiffusionRuleFindUniqueArgs): Promise<PublisherDiffusionRule | null> {
    return prisma.publisherDiffusionRule.findUnique(params);
  },

  async count(params: Prisma.PublisherDiffusionRuleCountArgs = {}): Promise<number> {
    return prisma.publisherDiffusionRule.count(params);
  },

  async create(params: Prisma.PublisherDiffusionRuleCreateArgs): Promise<PublisherDiffusionRule> {
    return prisma.publisherDiffusionRule.create(params);
  },

  async update(params: Prisma.PublisherDiffusionRuleUpdateArgs): Promise<PublisherDiffusionRule> {
    return prisma.publisherDiffusionRule.update(params);
  },

  async delete(params: Prisma.PublisherDiffusionRuleDeleteArgs): Promise<PublisherDiffusionRule> {
    return prisma.publisherDiffusionRule.delete(params);
  },

  async deleteMany(params: Prisma.PublisherDiffusionRuleDeleteManyArgs = {}): Promise<{ count: number }> {
    return prisma.publisherDiffusionRule.deleteMany(params);
  },
};
