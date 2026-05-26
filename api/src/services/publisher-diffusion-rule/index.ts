import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";
import { buildMissionPublisherDiffusionRuleSqlFromRules, buildMissionPublisherDiffusionRuleWhereFromRules } from "@/utils/publisher-diffusion-rule-query";

const findRulesByPublisherId = async (publisherId: string): Promise<PublisherDiffusionRule[]> =>
  prisma.publisherDiffusionRule.findMany({
    where: { publisherId },
    orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
  });

export const publisherDiffusionRuleService = {
  async buildMissionPublisherDiffusionRuleWhere(publisherId: string): Promise<Prisma.MissionWhereInput> {
    const rules = await findRulesByPublisherId(publisherId);

    return buildMissionPublisherDiffusionRuleWhereFromRules(rules);
  },

  async buildMissionPublisherDiffusionRuleSql(publisherId: string, options: { missionAlias?: string } = {}): Promise<Prisma.Sql> {
    const rules = await findRulesByPublisherId(publisherId);

    return buildMissionPublisherDiffusionRuleSqlFromRules(rules, options);
  },
};

export default publisherDiffusionRuleService;
