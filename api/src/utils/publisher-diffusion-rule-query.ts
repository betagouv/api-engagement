import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { OrganizationArrayIdsResolver, OrgArrayColumn } from "@/types/publisher-organization";
import {
  applyMissionRules,
  buildNestedMissionWhere,
  buildRuleCondition,
  collectMissionRuleConditions,
  normalizeTypedRuleValue,
  shouldSkipMissionRuleValue,
} from "@/utils/mission-rule";

export type PublisherDiffusionRuleCondition = Pick<PublisherDiffusionRule, "field" | "fieldType" | "operator" | "value" | "combinator">;

/**
 * Champs array (chemin Prisma) adossés à `PublisherOrganization` → colonne PostgreSQL.
 * Source de vérité unique d'où l'on dérive `ARRAY_FIELD_PATHS`.
 */
const ARRAY_FIELD_PATH_TO_COLUMN: Record<string, OrgArrayColumn> = {
  "publisherOrganization.parentOrganizations": "parent_organizations",
};
const ARRAY_FIELD_PATHS = new Set(Object.keys(ARRAY_FIELD_PATH_TO_COLUMN));

// Vrai si le champ est adossé à un tableau Postgres : l'appartenance est exacte (et non par sous-chaîne).
export const isPublisherDiffusionRuleArrayField = (field: string): boolean => ARRAY_FIELD_PATHS.has(field);

// Opérateurs array pour lesquels le matching doit être insensible à la casse (cf. règles widget).
const CASE_INSENSITIVE_ARRAY_OPERATORS = new Set(["is", "is_not", "contains", "does_not_contain"]);

type SqlFieldConfig = {
  column: string;
  source: "mission" | "publisherOrganization";
  kind: "scalar" | "array";
  castText?: boolean;
};

const FIELD_TO_SQL_CONFIG: Record<string, SqlFieldConfig> = {
  publisherId: { source: "mission", column: "publisher_id", kind: "scalar" },
  publisherOrganizationId: { source: "mission", column: "publisher_organization_id", kind: "scalar" },
  type: { source: "mission", column: "type", kind: "scalar", castText: true },
  "publisherOrganization.clientId": { source: "publisherOrganization", column: "client_id", kind: "scalar" },
  "publisherOrganization.parentOrganizations": { source: "publisherOrganization", column: "parent_organizations", kind: "array" },
};

const sqlIdentifier = (value: string) => Prisma.raw(`"${value.replaceAll('"', '""')}"`);

const missionColumnSql = (missionAlias: string, column: string, options: { castText?: boolean } = {}) =>
  Prisma.sql`${Prisma.raw(missionAlias)}.${sqlIdentifier(column)}${options.castText ? Prisma.raw("::text") : Prisma.empty}`;

const sqlContainsValue = (value: unknown) => `%${String(value)}%`;
const sqlStartsWithValue = (value: unknown) => `${String(value)}%`;

const shouldSkipValue = (rule: PublisherDiffusionRuleCondition, value: unknown) =>
  rule.operator !== "exists" && rule.operator !== "does_not_exist" && shouldSkipMissionRuleValue(value);

const buildScalarSqlCondition = (target: Prisma.Sql, rule: PublisherDiffusionRuleCondition): Prisma.Sql | null => {
  const value = normalizeTypedRuleValue(rule);

  if (shouldSkipValue(rule, value)) {
    return null;
  }

  switch (rule.operator) {
    case "is":
      return Prisma.sql`${target} = ${value}`;
    case "is_not":
      return Prisma.sql`${target} IS DISTINCT FROM ${value}`;
    case "contains":
      return Prisma.sql`${target} ILIKE ${sqlContainsValue(value)}`;
    case "does_not_contain":
      return Prisma.sql`${target} NOT ILIKE ${sqlContainsValue(value)}`;
    case "starts_with":
      return Prisma.sql`${target} ILIKE ${sqlStartsWithValue(value)}`;
    case "is_greater_than":
      return Prisma.sql`${target} > ${value}`;
    case "is_less_than":
      return Prisma.sql`${target} < ${value}`;
    case "exists":
      return Prisma.sql`${target} IS NOT NULL`;
    case "does_not_exist":
      return Prisma.sql`${target} IS NULL`;
    default:
      return null;
  }
};

const buildArraySqlCondition = (target: Prisma.Sql, rule: PublisherDiffusionRuleCondition): Prisma.Sql | null => {
  const value = normalizeTypedRuleValue(rule);

  if (shouldSkipValue(rule, value)) {
    return null;
  }

  // Matching insensible à la casse sur un tableau (`= ANY` étant sensible à la casse).
  const arrayContains = Prisma.sql`EXISTS (SELECT 1 FROM unnest(${target}) AS elem WHERE lower(elem) = lower(${value}))`;

  switch (rule.operator) {
    case "is":
    case "contains":
      return arrayContains;
    case "is_not":
    case "does_not_contain":
      return Prisma.sql`NOT ${arrayContains}`;
    case "exists":
      return Prisma.sql`COALESCE(cardinality(${target}), 0) > 0`;
    case "does_not_exist":
      return Prisma.sql`COALESCE(cardinality(${target}), 0) = 0`;
    default:
      return null;
  }
};

const buildPublisherOrganizationExistsSql = (missionAlias: string, condition: Prisma.Sql) => Prisma.sql`EXISTS (
  SELECT 1
  FROM "publisher_organization" po
  WHERE po."id" = ${Prisma.raw(missionAlias)}."publisher_organization_id"
    AND ${condition}
)`;

const buildRuleSqlCondition = (rule: PublisherDiffusionRuleCondition, missionAlias: string): Prisma.Sql | null => {
  const fieldConfig = FIELD_TO_SQL_CONFIG[rule.field];
  if (!fieldConfig) {
    return null;
  }

  const column =
    fieldConfig.source === "mission" ? missionColumnSql(missionAlias, fieldConfig.column, { castText: fieldConfig.castText }) : Prisma.sql`po.${sqlIdentifier(fieldConfig.column)}`;

  const condition = fieldConfig.kind === "array" ? buildArraySqlCondition(column, rule) : buildScalarSqlCondition(column, rule);
  if (!condition) {
    return null;
  }

  if (fieldConfig.source === "publisherOrganization") {
    return buildPublisherOrganizationExistsSql(missionAlias, condition);
  }

  return condition;
};

const combineRuleSqlConditions = (rules: PublisherDiffusionRuleCondition[], missionAlias: string): Prisma.Sql | null => {
  const { andConditions, orConditions } = collectMissionRuleConditions(rules, (rule) => buildRuleSqlCondition(rule, missionAlias));

  const parts: Prisma.Sql[] = [];

  if (andConditions.length > 0) {
    parts.push(Prisma.sql`(${Prisma.join(andConditions, " AND ")})`);
  }

  if (orConditions.length > 0) {
    parts.push(Prisma.sql`(${Prisma.join(orConditions, " OR ")})`);
  }

  if (parts.length === 0) {
    return null;
  }

  return Prisma.sql`(${Prisma.join(parts, " AND ")})`;
};

export const buildMissionPublisherDiffusionRuleConditionFromRule = async (
  rule: PublisherDiffusionRuleCondition,
  resolveOrganizationIds: OrganizationArrayIdsResolver
): Promise<Prisma.MissionWhereInput | null> => {
  // Champs array d'organisation : matching insensible à la casse via pré-résolution des ids (cf. règles widget).
  const column = ARRAY_FIELD_PATH_TO_COLUMN[rule.field];
  if (column && CASE_INSENSITIVE_ARRAY_OPERATORS.has(rule.operator)) {
    const value = normalizeTypedRuleValue(rule);
    if (shouldSkipMissionRuleValue(value)) {
      return null;
    }
    const ids = await resolveOrganizationIds(column, `${value}`);
    const base: Prisma.MissionWhereInput = { publisherOrganizationId: { in: ids } };
    return rule.operator === "is_not" || rule.operator === "does_not_contain" ? { NOT: base } : base;
  }

  // Autres champs (scalaires, ou exists/does_not_exist sur array) : logique générique inchangée.
  return buildRuleCondition(rule, { arrayFields: ARRAY_FIELD_PATHS, buildFieldWhere: buildNestedMissionWhere });
};

export const buildMissionPublisherDiffusionRuleWhereFromRules = (rules: PublisherDiffusionRuleCondition[]): Prisma.MissionWhereInput =>
  applyMissionRules(rules, {
    arrayFields: ARRAY_FIELD_PATHS,
    buildFieldWhere: buildNestedMissionWhere,
  });

export const buildMissionPublisherDiffusionRuleSqlFromRules = (rules: PublisherDiffusionRuleCondition[], options: { missionAlias?: string } = {}): Prisma.Sql => {
  if (rules.length === 0) {
    return Prisma.empty;
  }

  const condition = combineRuleSqlConditions(rules, options.missionAlias ?? "m");

  if (!condition) {
    return Prisma.sql`AND FALSE`;
  }

  return Prisma.sql`AND ${condition}`;
};
