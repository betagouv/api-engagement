import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";
import { buildMissionPublisherDiffusionRuleSqlFromRules, buildMissionPublisherDiffusionRuleWhereFromRules } from "@/utils/publisher-diffusion-rule-query";

const findRulesByPublisherId = async (publisherId: string): Promise<PublisherDiffusionRule[]> =>
  prisma.publisherDiffusionRule.findMany({
    where: { publisherId },
    orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
  });

const MISSION_ACCESS_RULE_FIELDS = new Set(["publisherId", "publisherOrganizationId", "type", "title", "publisherOrganization.clientId", "publisherOrganization.parentOrganizations"]);

export const publisherDiffusionRuleService = {
  async buildMissionPublisherDiffusionRuleWhere(publisherId: string): Promise<Prisma.MissionWhereInput> {
    const rules = await findRulesByPublisherId(publisherId);

    return buildMissionPublisherDiffusionRuleWhereFromRules(rules);
  },

  async canPublisherAccessMission({ publisherId, missionId }: { publisherId: string; missionId: string }): Promise<boolean> {
    const rules = await findRulesByPublisherId(publisherId);
    if (rules.length === 0) {
      return true;
    }

    const accessRules = rules.filter((rule) => MISSION_ACCESS_RULE_FIELDS.has(rule.field));
    if (accessRules.length === 0) {
      return false;
    }

    const diffusionRuleWhere = buildMissionPublisherDiffusionRuleWhereFromRules(accessRules);
    if (Object.keys(diffusionRuleWhere).length === 0) {
      return false;
    }

    const count = await prisma.mission.count({
      where: {
        AND: [{ id: missionId }, diffusionRuleWhere],
      },
    });

    return count > 0;
  },

  async buildMissionPublisherDiffusionRuleSql(publisherId: string, options: { missionAlias?: string } = {}): Promise<Prisma.Sql> {
    const rules = await findRulesByPublisherId(publisherId);

    return buildMissionPublisherDiffusionRuleSqlFromRules(rules, options);
  },
};

export default publisherDiffusionRuleService;
