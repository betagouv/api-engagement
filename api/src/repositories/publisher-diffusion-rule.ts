import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";

// Permet d'exécuter les opérations dans une transaction Prisma existante (tx) ou hors transaction.
const client = (tx?: Prisma.TransactionClient) => tx ?? prisma;

// Une même date ferme la période de validité de la règle et de ses descendants.
const archiveRules = async (ids: string[], tx: Prisma.TransactionClient): Promise<void> => {
  if (!ids.length) {
    return;
  }
  await tx.$executeRaw(Prisma.sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM publisher_diffusion_rule WHERE id IN (${Prisma.join(ids)})
      UNION
      SELECT child.id FROM publisher_diffusion_rule child
      JOIN descendants parent ON child.combined_with_id = parent.id
    )
    UPDATE publisher_diffusion_rule
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (SELECT id FROM descendants) AND deleted_at IS NULL
  `);
};

export const publisherDiffusionRuleRepository = {
  async findMany(params: Prisma.PublisherDiffusionRuleFindManyArgs = {}, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule[]> {
    return client(tx).publisherDiffusionRule.findMany({ ...params, where: { ...params.where, deletedAt: null } });
  },

  async findFirst(params: Prisma.PublisherDiffusionRuleFindFirstArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule | null> {
    return client(tx).publisherDiffusionRule.findFirst({ ...params, where: { ...params.where, deletedAt: null } });
  },

  async findUnique(params: Prisma.PublisherDiffusionRuleFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule | null> {
    return client(tx).publisherDiffusionRule.findUnique({ ...params, where: { ...params.where, deletedAt: null } });
  },

  async count(params: Prisma.PublisherDiffusionRuleCountArgs = {}, tx?: Prisma.TransactionClient): Promise<number> {
    return client(tx).publisherDiffusionRule.count({ ...params, where: { ...params.where, deletedAt: null } });
  },

  async create(params: Prisma.PublisherDiffusionRuleCreateArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    return client(tx).publisherDiffusionRule.create(params);
  },

  async update(params: Prisma.PublisherDiffusionRuleUpdateArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    return client(tx).publisherDiffusionRule.update(params);
  },

  async delete(params: Prisma.PublisherDiffusionRuleDeleteArgs, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRule> {
    const archive = async (transaction: Prisma.TransactionClient) => {
      const rule = await transaction.publisherDiffusionRule.findUniqueOrThrow({ where: { ...params.where, deletedAt: null } });
      await archiveRules([rule.id], transaction);
      return rule;
    };
    return tx ? archive(tx) : prisma.$transaction(archive);
  },

  async deleteMany(params: Prisma.PublisherDiffusionRuleDeleteManyArgs = {}, tx?: Prisma.TransactionClient): Promise<{ count: number }> {
    const archive = async (transaction: Prisma.TransactionClient) => {
      const rules = await transaction.publisherDiffusionRule.findMany({ where: { ...params.where, deletedAt: null }, select: { id: true } });
      await archiveRules(rules.map((rule) => rule.id), transaction);
      return { count: rules.length };
    };
    return tx ? archive(tx) : prisma.$transaction(archive);
  },

};
