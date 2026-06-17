import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";

// Permet d'exécuter les opérations dans une transaction Prisma existante (tx) ou hors transaction.
const client = (tx?: Prisma.TransactionClient) => tx ?? prisma;

export const publisherDiffusionRuleRepository = {
  async findMany(params: Prisma.PublisherDiffusionRuleFindManyArgs = {}, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule[]> {
    return client(tx).publisherDiffusionRule.findMany(params);
  },

  async findFirst(params: Prisma.PublisherDiffusionRuleFindFirstArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule | null> {
    return client(tx).publisherDiffusionRule.findFirst(params);
  },

  async findUnique(params: Prisma.PublisherDiffusionRuleFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule | null> {
    return client(tx).publisherDiffusionRule.findUnique(params);
  },

  async count(params: Prisma.PublisherDiffusionRuleCountArgs = {}, tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).publisherDiffusionRule.count(params);
  },

  async create(params: Prisma.PublisherDiffusionRuleCreateArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    return client(tx).publisherDiffusionRule.create(params);
  },

  async update(params: Prisma.PublisherDiffusionRuleUpdateArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    return client(tx).publisherDiffusionRule.update(params);
  },

  async delete(params: Prisma.PublisherDiffusionRuleDeleteArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    return client(tx).publisherDiffusionRule.delete(params);
  },

  async deleteMany(params: Prisma.PublisherDiffusionRuleDeleteManyArgs = {}, tx?: Prisma.TransactionClient): Promise<{ count: number }> {
    return client(tx).publisherDiffusionRule.deleteMany(params);
  },
};
