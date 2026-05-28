import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { publisherDiffusionRuleRepository } from "@/repositories/publisher-diffusion-rule";
import type {
  PublisherDiffusionRuleCombinator,
  PublisherDiffusionRuleCreateInput,
  PublisherDiffusionRuleFindParams,
  PublisherDiffusionRuleRecord,
} from "@/types/publisher-diffusion-rule";
import { buildMissionPublisherDiffusionRuleSqlFromRules } from "@/utils/publisher-diffusion-rule-query";

type PublisherDiffusionRuleWithChildren = PublisherDiffusionRule & {
  combinedRules?: PublisherDiffusionRule[];
};

type RuleCondition = Pick<PublisherDiffusionRule, "field" | "fieldType" | "operator" | "value">;

const ARRAY_FIELD_PATHS = new Set(["publisherOrganization.parentOrganizations"]);

const normalizeBooleanValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0"].includes(normalized)) {
    return false;
  }
  return value;
};

const normalizeRuleValue = (rule: RuleCondition) => {
  if (rule.fieldType === "boolean") {
    return normalizeBooleanValue(rule.value);
  }
  if (rule.fieldType === "number" || rule.fieldType === "int" || rule.fieldType === "float") {
    const parsed = Number(rule.value);
    return Number.isNaN(parsed) ? rule.value : parsed;
  }
  return rule.value;
};

const buildNestedWhere = (fieldPath: string, condition: unknown): Prisma.MissionWhereInput =>
  fieldPath
    .split(".")
    .reverse()
    .reduce<Prisma.MissionWhereInput>((acc, key) => ({ [key]: acc }), condition as Prisma.MissionWhereInput);

const buildRuleCondition = (rule: RuleCondition): Prisma.MissionWhereInput | null => {
  const value = normalizeRuleValue(rule);
  const isArrayField = rule.fieldType === "array" || ARRAY_FIELD_PATHS.has(rule.field);

  if (rule.operator !== "exists" && rule.operator !== "does_not_exist" && (value === "" || value === null || value === undefined)) {
    return null;
  }

  switch (rule.operator) {
    case "is":
      return buildNestedWhere(rule.field, isArrayField ? { has: `${value}` } : value);
    case "is_not":
      if (isArrayField) {
        return { NOT: buildNestedWhere(rule.field, { has: `${value}` }) };
      }
      return buildNestedWhere(rule.field, { not: value });
    case "contains":
      return buildNestedWhere(rule.field, isArrayField ? { has: `${value}` } : { contains: value, mode: "insensitive" });
    case "does_not_contain":
      if (isArrayField) {
        return { NOT: buildNestedWhere(rule.field, { has: `${value}` }) };
      }
      return { NOT: buildNestedWhere(rule.field, { contains: value, mode: "insensitive" }) };
    case "starts_with":
      return buildNestedWhere(rule.field, { startsWith: value, mode: "insensitive" });
    case "is_greater_than":
      return buildNestedWhere(rule.field, { gt: value });
    case "is_less_than":
      return buildNestedWhere(rule.field, { lt: value });
    case "exists":
      return buildNestedWhere(rule.field, isArrayField ? { isEmpty: false } : { not: null });
    case "does_not_exist":
      return buildNestedWhere(rule.field, isArrayField ? { isEmpty: true } : null);
    default:
      return null;
  }
};

const buildNodeCondition = (rule: PublisherDiffusionRule, childrenByParentId: Map<string, PublisherDiffusionRule[]>): Prisma.MissionWhereInput | null => {
  const selfCondition = buildRuleCondition(rule);
  if (!selfCondition) {
    return null;
  }

  const children = (childrenByParentId.get(rule.id) ?? [])
    .map((child: PublisherDiffusionRule) => buildNodeCondition(child, childrenByParentId))
    .filter((condition: Prisma.MissionWhereInput | null): condition is Prisma.MissionWhereInput => Boolean(condition));

  if (!children.length) {
    return selfCondition;
  }

  const childrenAnd = children.length === 1 ? children[0] : { AND: children };
  return { OR: [{ NOT: selfCondition }, childrenAnd] };
};

const buildMissionWhere = (rules: PublisherDiffusionRule[]): Prisma.MissionWhereInput => {
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

  const groups = roots
    .map((root: PublisherDiffusionRule) => buildNodeCondition(root, childrenByParentId))
    .filter((group: Prisma.MissionWhereInput | null): group is Prisma.MissionWhereInput => Boolean(group));

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
    const rules = await publisherDiffusionRuleRepository.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });

    return buildMissionWhere(rules);
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
