import { Prisma } from "@/db/core";

export type MissionRule = {
  field: string;
  fieldType?: string | null;
  operator: string;
  value?: string | null;
  combinator: string;
};

type MissionRuleOptions = {
  arrayFields?: ReadonlySet<string>;
  fieldMappers?: Record<string, (condition: unknown) => Prisma.MissionWhereInput>;
  normalizeOperator?: (rule: MissionRule, isArrayField: boolean) => string;
  normalizeValue?: (rule: MissionRule) => unknown;
  buildFieldWhere?: (field: string, condition: unknown) => Prisma.MissionWhereInput;
  skipEmptyValue?: (value: unknown) => boolean;
};

export const shouldSkipMissionRuleValue = (value: unknown): boolean => value === "" || value === null || value === undefined;

export const normalizeBooleanRuleValue = (value?: string | null) => {
  if (!value) {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0"].includes(normalized)) {
    return false;
  }
  return value;
};

export const normalizeTypedRuleValue = (rule: MissionRule) => {
  if (rule.fieldType === "boolean") {
    return normalizeBooleanRuleValue(rule.value);
  }
  if (rule.fieldType === "number" || rule.fieldType === "int" || rule.fieldType === "float") {
    const parsed = Number(rule.value);
    return Number.isNaN(parsed) ? rule.value : parsed;
  }
  return rule.value;
};

export const buildNestedMissionWhere = (fieldPath: string, condition: unknown): Prisma.MissionWhereInput =>
  fieldPath
    .split(".")
    .reverse()
    .reduce<Prisma.MissionWhereInput>((acc, key) => ({ [key]: acc }), condition as Prisma.MissionWhereInput);

const buildDefaultFieldWhere = (field: string, condition: unknown): Prisma.MissionWhereInput => ({ [field]: condition });

export const buildRuleCondition = (rule: MissionRule, options: MissionRuleOptions = {}): Prisma.MissionWhereInput | null => {
  const isArrayField = rule.fieldType === "array" || Boolean(options.arrayFields?.has(rule.field));
  const operator = options.normalizeOperator?.(rule, isArrayField) ?? rule.operator;
  const value = options.normalizeValue?.(rule) ?? normalizeTypedRuleValue(rule);
  const skipEmpty = options.skipEmptyValue ?? shouldSkipMissionRuleValue;

  if (operator !== "exists" && operator !== "does_not_exist" && skipEmpty(value)) {
    return null;
  }

  let condition: unknown;

  switch (operator) {
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

  const mapper = options.fieldMappers?.[rule.field];
  const where = mapper ? mapper(condition) : (options.buildFieldWhere ?? buildDefaultFieldWhere)(rule.field, condition);

  if (operator === "does_not_contain" || (operator === "is_not" && isArrayField)) {
    return { NOT: where };
  }

  return where;
};

export const collectMissionRuleConditions = <Rule extends MissionRule, T>(rules: Rule[], buildCondition: (rule: Rule) => T | null): { andConditions: T[]; orConditions: T[] } => {
  const andConditions: T[] = [];
  const orConditions: T[] = [];

  rules.forEach((rule, index) => {
    const condition = buildCondition(rule);
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

  return { andConditions, orConditions };
};

export const applyMissionRules = (rules: MissionRule[], options: MissionRuleOptions = {}): Prisma.MissionWhereInput => {
  const { andConditions, orConditions } = collectMissionRuleConditions(rules, (rule) => buildRuleCondition(rule, options));

  const where: Prisma.MissionWhereInput = {};

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  return where;
};
