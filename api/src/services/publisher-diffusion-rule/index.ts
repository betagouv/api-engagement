import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { RESSOURCE_ALREADY_EXIST } from "@/error";
import { missionRepository } from "@/repositories/mission";
import { publisherDiffusionRuleRepository } from "@/repositories/publisher-diffusion-rule";
import publisherOrganizationService from "@/services/publisher-organization";
import type {
  PublisherDiffusionRuleCombinator,
  PublisherDiffusionRuleCreateInput,
  PublisherDiffusionRuleFindParams,
  PublisherDiffusionRuleRecord,
} from "@/types/publisher-diffusion-rule";
import type { OrganizationArrayIdsResolver } from "@/types/publisher-organization";
import {
  buildMissionPublisherDiffusionRuleConditionFromRule,
  buildMissionPublisherDiffusionRuleSqlFromRules,
  isPublisherDiffusionRuleArrayField,
} from "@/utils/publisher-diffusion-rule-query";

type PublisherDiffusionRuleWithChildren = PublisherDiffusionRule & {
  combinedRules?: PublisherDiffusionRule[];
  combinedWith?: PublisherDiffusionRule | null;
};

const buildNodeCondition = async (
  rule: PublisherDiffusionRule,
  childrenByParentId: Map<string, PublisherDiffusionRule[]>,
  resolveOrganizationIds: OrganizationArrayIdsResolver
): Promise<Prisma.MissionWhereInput | null> => {
  const selfCondition = await buildMissionPublisherDiffusionRuleConditionFromRule(rule, resolveOrganizationIds);
  if (!selfCondition) {
    return null;
  }

  const children = (
    await Promise.all((childrenByParentId.get(rule.id) ?? []).map((child: PublisherDiffusionRule) => buildNodeCondition(child, childrenByParentId, resolveOrganizationIds)))
  ).filter((condition: Prisma.MissionWhereInput | null): condition is Prisma.MissionWhereInput => Boolean(condition));

  if (!children.length) {
    return selfCondition;
  }

  const childrenAnd = children.length === 1 ? children[0] : { AND: children };
  return { OR: [{ NOT: selfCondition }, childrenAnd] };
};

const buildMissionWhere = async (rules: PublisherDiffusionRule[], resolveOrganizationIds: OrganizationArrayIdsResolver): Promise<Prisma.MissionWhereInput> => {
  const childrenByParentId = new Map<string, PublisherDiffusionRule[]>();
  const roots: PublisherDiffusionRule[] = [];

  for (const rule of rules) {
    if (rule.combinedWithId === null) {
      roots.push(rule);
    } else {
      const siblings = childrenByParentId.get(rule.combinedWithId) ?? [];
      siblings.push(rule);
      childrenByParentId.set(rule.combinedWithId, siblings);
    }
  }

  const groups = (await Promise.all(roots.map((root: PublisherDiffusionRule) => buildNodeCondition(root, childrenByParentId, resolveOrganizationIds)))).filter(
    (group: Prisma.MissionWhereInput | null): group is Prisma.MissionWhereInput => Boolean(group)
  );

  if (!groups.length) {
    return {};
  }
  if (groups.length === 1) {
    return groups[0];
  }
  return { AND: groups };
};

const toRecord = (rule: PublisherDiffusionRuleWithChildren): PublisherDiffusionRuleRecord => ({
  id: rule.id,
  publisherId: rule.publisherId,
  combinedWithId: rule.combinedWithId,
  field: rule.field,
  fieldType: rule.fieldType,
  operator: rule.operator,
  value: rule.value,
  combinator: rule.combinator as PublisherDiffusionRuleCombinator,
  position: rule.position,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
  combinedRules: rule.combinedRules?.map(toRecord),
  combinedWith: rule.combinedWith ? toRecord(rule.combinedWith) : null,
});

const EXCLUSION_OPERATORS = new Set(["is_not", "does_not_contain", "does_not_exist"]);

const ruleExcludesValue = (rule: PublisherDiffusionRuleRecord, value: string): boolean => {
  const ruleValue = (rule.value ?? "").toLowerCase();
  const candidate = value.toLowerCase();
  switch (rule.operator) {
    case "is_not":
      return candidate === ruleValue;
    case "does_not_contain":
      // Champs array (ex. parentOrganizations) : appartenance exacte comme le filtrage réel ; champs scalaires : sous-chaîne (ILIKE %...%).
      return isPublisherDiffusionRuleArrayField(rule.field) ? candidate === ruleValue : candidate.includes(ruleValue);
    case "does_not_exist":
      return candidate.length > 0;
    default:
      return false;
  }
};

const buildFindWhere = (params: PublisherDiffusionRuleFindParams): Prisma.PublisherDiffusionRuleWhereInput => {
  const where: Prisma.PublisherDiffusionRuleWhereInput = {};
  if (params.publisherId) {
    where.publisherId = params.publisherId;
  }
  if (params.publisherIds?.length) {
    where.publisherId = { in: params.publisherIds };
  }
  if (params.combinedWithId !== undefined) {
    where.combinedWithId = params.combinedWithId;
  }
  if (params.field) {
    where.field = params.field;
  }
  if (params.value) {
    where.value = params.value;
  }
  return where;
};

export const publisherDiffusionRuleService = {
  async buildMissionPublisherDiffusionRuleWhere(publisherId: string): Promise<Prisma.MissionWhereInput> {
    const rules = await publisherDiffusionRuleRepository.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });

    return buildMissionWhere(rules, publisherOrganizationService.findIdsMatchingArrayValue);
  },

  async canPublisherAccessMission({ publisherId, missionId }: { publisherId: string; missionId: string }): Promise<boolean> {
    const rules = await publisherDiffusionRuleRepository.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });
    if (rules.length === 0) {
      return true;
    }

    const diffusionRuleWhere = await buildMissionWhere(rules, publisherOrganizationService.findIdsMatchingArrayValue);
    if (Object.keys(diffusionRuleWhere).length === 0) {
      return false;
    }

    const count = await missionRepository.count({ AND: [{ id: missionId }, diffusionRuleWhere] });

    return count > 0;
  },

  async buildMissionPublisherDiffusionRuleSql(publisherId: string, options: { missionAlias?: string } = {}): Promise<Prisma.Sql> {
    const rules = await publisherDiffusionRuleRepository.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });

    return buildMissionPublisherDiffusionRuleSqlFromRules(rules, options);
  },

  isValueDiffused({ rules, field, value }: { rules: PublisherDiffusionRuleRecord[]; field: string; value: string }): boolean {
    return !rules.some((rule) => rule.field === field && EXCLUSION_OPERATORS.has(rule.operator) && ruleExcludesValue(rule, value));
  },

  async findRules(params: PublisherDiffusionRuleFindParams = {}): Promise<PublisherDiffusionRuleRecord[]> {
    const rules = (await publisherDiffusionRuleRepository.findMany({
      where: buildFindWhere(params),
      include: params.includeCombinedRules ? { combinedRules: true } : undefined,
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    })) as PublisherDiffusionRuleWithChildren[];

    return rules.map(toRecord);
  },

  async findRuleById(id: string): Promise<PublisherDiffusionRuleRecord | null> {
    const rule = (await publisherDiffusionRuleRepository.findUnique({
      where: { id },
      include: { combinedRules: true, combinedWith: true },
    })) as PublisherDiffusionRuleWithChildren | null;

    return rule ? toRecord(rule) : null;
  },

  async createRule(input: PublisherDiffusionRuleCreateInput): Promise<PublisherDiffusionRuleRecord> {
    const created = (await publisherDiffusionRuleRepository.create({
      data: {
        publisher: { connect: { id: input.publisherId } },
        combinedWith: input.combinedWithId ? { connect: { id: input.combinedWithId } } : undefined,
        field: input.field,
        fieldType: input.fieldType ?? undefined,
        operator: input.operator,
        value: input.value,
        combinator: input.combinator,
        position: input.position ?? 0,
      },
      include: { combinedRules: true },
    })) as PublisherDiffusionRuleWithChildren;

    return toRecord(created);
  },

  async findOrCreateScopeRoot(diffuseurPublisherId: string, annonceurPublisherId: string): Promise<PublisherDiffusionRuleRecord> {
    const rootWhere = { publisherId: diffuseurPublisherId, combinedWithId: null, field: "publisherId", value: annonceurPublisherId };

    const existing = await publisherDiffusionRuleRepository.findFirst({ where: rootWhere, include: { combinedRules: true } });
    if (existing) {
      return toRecord(existing as PublisherDiffusionRuleWithChildren);
    }

    try {
      const created = (await publisherDiffusionRuleRepository.create({
        data: {
          publisher: { connect: { id: diffuseurPublisherId } },
          field: "publisherId",
          fieldType: "string",
          operator: "is",
          value: annonceurPublisherId,
          combinator: "or",
          position: 0,
        },
        include: { combinedRules: true },
      })) as PublisherDiffusionRuleWithChildren;

      return toRecord(created);
    } catch (error) {
      // Course concurrente : un autre process a créé le root entre-temps (rejeté par l'index unique partiel sur les roots).
      if ((error as { code?: string }).code === "P2002") {
        const root = await publisherDiffusionRuleRepository.findFirst({ where: rootWhere, include: { combinedRules: true } });
        if (root) {
          return toRecord(root as PublisherDiffusionRuleWithChildren);
        }
      }
      throw error;
    }
  },

  async createScopedRule(input: {
    diffuseurPublisherId: string;
    annonceurPublisherId: string;
    field: string;
    fieldType?: string | null;
    operator: string;
    value: string;
  }): Promise<PublisherDiffusionRuleRecord> {
    const root = await this.findOrCreateScopeRoot(input.diffuseurPublisherId, input.annonceurPublisherId);

    const existing = await publisherDiffusionRuleRepository.findFirst({
      where: { publisherId: input.diffuseurPublisherId, combinedWithId: root.id, field: input.field, value: input.value },
      include: { combinedRules: true },
    });
    if (existing) {
      // Idempotent uniquement si la règle est réellement identique. Sinon on refuse explicitement au lieu de
      // renvoyer silencieusement une règle qui ne correspond pas à la demande (clé unique sur field + value).
      const isSameRule = existing.operator === input.operator && (existing.fieldType ?? null) === (input.fieldType ?? null);
      if (isSameRule) {
        return toRecord(existing as PublisherDiffusionRuleWithChildren);
      }
      const conflict = new Error(`A diffusion rule already exists for field "${input.field}" and value "${input.value}" with a different operator`) as Error & {
        code: string;
        status: number;
      };
      conflict.code = RESSOURCE_ALREADY_EXIST;
      conflict.status = 409;
      throw conflict;
    }

    const created = (await publisherDiffusionRuleRepository.create({
      data: {
        publisher: { connect: { id: input.diffuseurPublisherId } },
        combinedWith: { connect: { id: root.id } },
        field: input.field,
        fieldType: input.fieldType ?? undefined,
        operator: input.operator,
        value: input.value,
        combinator: "or",
        position: 0,
      },
      include: { combinedRules: true },
    })) as PublisherDiffusionRuleWithChildren;

    return toRecord(created);
  },

  async deleteRule(id: string): Promise<void> {
    await publisherDiffusionRuleRepository.delete({ where: { id } });
  },

  async deleteRules(params: PublisherDiffusionRuleFindParams): Promise<number> {
    const result = await publisherDiffusionRuleRepository.deleteMany({
      where: buildFindWhere(params),
    });
    return result.count;
  },
};

export default publisherDiffusionRuleService;
