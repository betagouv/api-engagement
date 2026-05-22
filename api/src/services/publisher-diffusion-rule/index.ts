import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { prisma } from "@/db/postgres";

type PublisherDiffusionRuleCondition = Pick<PublisherDiffusionRule, "field" | "fieldType" | "operator" | "value" | "combinator">;

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

const normalizeRuleValue = (rule: PublisherDiffusionRuleCondition) => {
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

const buildRuleCondition = (rule: PublisherDiffusionRuleCondition): Prisma.MissionWhereInput | null => {
  const fieldPath = rule.field;
  const value = normalizeRuleValue(rule);
  const isArrayField = rule.fieldType === "array" || ARRAY_FIELD_PATHS.has(fieldPath);

  if (rule.operator !== "exists" && rule.operator !== "does_not_exist" && (value === "" || value === null || value === undefined)) {
    return null;
  }

  let condition: unknown;

  switch (rule.operator) {
    case "is":
      condition = isArrayField ? { has: `${value}` } : value;
      break;
    case "is_not":
      condition = isArrayField ? { has: `${value}` } : { not: value };
      break;
    case "contains":
      condition = isArrayField ? { has: `${value}` } : { contains: value, mode: "insensitive" };
      break;
    case "does_not_contain":
      condition = isArrayField ? { has: `${value}` } : { contains: value, mode: "insensitive" };
      break;
    case "starts_with":
      condition = { startsWith: value, mode: "insensitive" };
      break;
    case "is_greater_than":
      condition = { gt: value };
      break;
    case "is_less_than":
      condition = { lt: value };
      break;
    case "exists":
      condition = isArrayField ? { isEmpty: false } : { not: null };
      break;
    case "does_not_exist":
      condition = isArrayField ? { isEmpty: true } : null;
      break;
    default:
      return null;
  }

  const where = buildNestedWhere(fieldPath, condition);

  if (rule.operator === "does_not_contain" || (rule.operator === "is_not" && isArrayField)) {
    return { NOT: where };
  }

  return where;
};

const applyPublisherDiffusionRules = (rules: PublisherDiffusionRuleCondition[]): Prisma.MissionWhereInput => {
  const andConditions: Prisma.MissionWhereInput[] = [];
  const orConditions: Prisma.MissionWhereInput[] = [];

  rules.forEach((rule, index) => {
    const condition = buildRuleCondition(rule);
    if (!condition) {
      return;
    }

    let combinator = rule.combinator;
    if (index === 0 && rules.length > 1) {
      combinator = rules[1].combinator;
    }

    if (combinator === "and") {
      andConditions.push(condition);
      return;
    }
    if (combinator === "or") {
      orConditions.push(condition);
    }
  });

  const where: Prisma.MissionWhereInput = {};

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  return where;
};

export const publisherDiffusionRuleService = {
  async buildMissionPublisherDiffusionRuleWhere(publisherId: string): Promise<Prisma.MissionWhereInput> {
    const rules = await prisma.publisherDiffusionRule.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });

    return applyPublisherDiffusionRules(rules);
  },
};

export default publisherDiffusionRuleService;
