import { Prisma, PublisherDiffusionRule } from "@/db/core";
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
import { buildMissionPublisherDiffusionRuleConditionFromRule, buildMissionPublisherDiffusionRuleSqlFromRules } from "@/utils/publisher-diffusion-rule-query";

type PublisherDiffusionRuleWithChildren = PublisherDiffusionRule & {
  combinedRules?: PublisherDiffusionRule[];
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

/**
 * Indexe une liste plate de rules par parent : racines (`combinedWithId === null`)
 * d'un côté, enfants regroupés par `combinedWithId` de l'autre. Partagé par les
 * constructeurs de `where` (implication et allowlist).
 */
const groupRulesByParent = (rules: PublisherDiffusionRule[]): { roots: PublisherDiffusionRule[]; childrenByParentId: Map<string, PublisherDiffusionRule[]> } => {
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

  return { roots, childrenByParentId };
};

/**
 * Forme allowlist d'un nœud : `selfCondition AND (enfants)`. Miroir positif de
 * `buildNodeCondition` (qui encode l'implication `NOT self OR enfants`) : même
 * parcours d'arbre via `combinedWithId`, enfants combinés en `AND` (le champ
 * `combinator` n'est pas pris en compte, cohérent avec la forme implication).
 */
const buildAllowlistNodeCondition = async (
  rule: PublisherDiffusionRule,
  childrenByParentId: Map<string, PublisherDiffusionRule[]>,
  resolveOrganizationIds: OrganizationArrayIdsResolver
): Promise<Prisma.MissionWhereInput | null> => {
  const selfCondition = await buildMissionPublisherDiffusionRuleConditionFromRule(rule, resolveOrganizationIds);

  const children = (
    await Promise.all(
      (childrenByParentId.get(rule.id) ?? []).map((child: PublisherDiffusionRule) => buildAllowlistNodeCondition(child, childrenByParentId, resolveOrganizationIds))
    )
  ).filter((condition: Prisma.MissionWhereInput | null): condition is Prisma.MissionWhereInput => Boolean(condition));

  if (!children.length) {
    return selfCondition;
  }

  const childrenAnd = children.length === 1 ? children[0] : { AND: children };
  if (!selfCondition) {
    return childrenAnd;
  }
  return { AND: [selfCondition, childrenAnd] };
};

const buildMissionWhere = async (rules: PublisherDiffusionRule[], resolveOrganizationIds: OrganizationArrayIdsResolver): Promise<Prisma.MissionWhereInput> => {
  const { roots, childrenByParentId } = groupRulesByParent(rules);

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

const buildDiffuseurCandidateFilterFromRules = async (
  rules: PublisherDiffusionRule[]
): Promise<{ where: Prisma.MissionWhereInput; publisherIds: string[] }> => {
  const { roots, childrenByParentId } = groupRulesByParent(rules);
  const scopeRoots = roots.filter((root) => root.field === "publisherId" && root.operator === "is");

  const scopes = (
    await Promise.all(scopeRoots.map((root) => buildAllowlistNodeCondition(root, childrenByParentId, publisherOrganizationService.findIdsMatchingArrayValue)))
  ).filter((scope): scope is Prisma.MissionWhereInput => scope !== null && Object.keys(scope).length > 0);

  const publisherIds = Array.from(new Set(scopeRoots.map((root) => root.value)));

  if (scopes.length === 0) {
    return { where: {}, publisherIds };
  }
  return { where: scopes.length === 1 ? scopes[0] : { OR: scopes }, publisherIds };
};

const findOrderedRules = (publisherId: string): Promise<PublisherDiffusionRule[]> =>
  publisherDiffusionRuleRepository.findMany({
    where: { publisherId },
    orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
  });

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
});

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
    const rules = await findOrderedRules(publisherId);
    return buildMissionWhere(rules, publisherOrganizationService.findIdsMatchingArrayValue);
  },

  /**
   * Construit le where des missions qu'un diffuseur peut diffuser, sous forme
   * d'allowlist : `OR` des scopes, chaque scope = `publisherId` de l'annonceur
   * (root) `AND` ses critères/exclusions enfants. Contrairement à
   * `buildMissionPublisherDiffusionRuleWhere` (forme implication, pensée pour
   * contraindre un ensemble déjà restreint), cette forme exclut nativement les
   * publishers hors annonceurs et reste valide avec plusieurs scopes.
   */
  async buildMissionDiffuseurCandidateWhere(publisherId: string): Promise<Prisma.MissionWhereInput> {
    const rules = await findOrderedRules(publisherId);
    const { where } = await buildDiffuseurCandidateFilterFromRules(rules);
    return where;
  },

  async buildMissionDiffuseurCandidateFilter(publisherId: string): Promise<{ where: Prisma.MissionWhereInput; publisherIds: string[] }> {
    const rules = await findOrderedRules(publisherId);
    return buildDiffuseurCandidateFilterFromRules(rules);
  },

  async canPublisherAccessMission({ publisherId, missionId }: { publisherId: string; missionId: string }): Promise<boolean> {
    const rules = await findOrderedRules(publisherId);
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
      include: { combinedRules: true },
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
    const existing = await publisherDiffusionRuleRepository.findFirst({
      where: { publisherId: diffuseurPublisherId, combinedWithId: null, field: "publisherId", value: annonceurPublisherId },
      include: { combinedRules: true },
    });
    if (existing) {
      return toRecord(existing as PublisherDiffusionRuleWithChildren);
    }

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
