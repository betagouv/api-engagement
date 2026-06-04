import type { Prisma } from "@/db/core";
import { captureException } from "@/error";
import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

type MissionDiffusionRulesFilter =
  | {
      kind: "all";
      missionWhere: null;
    }
  | {
      kind: "filter";
      filterBy: string;
      missionWhere: Prisma.MissionWhereInput;
    }
  | {
      kind: "none";
      missionWhere: null;
    };

const escapeTypesenseFilterValue = (value: string): string => {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
};

const buildTypesenseListFilter = (field: string, values: string[]): string => `${field}:=[${values.map(escapeTypesenseFilterValue).join(",")}]`;

const isSupportedPublisherWhitelistRule = (rule: PublisherDiffusionRuleRecord): boolean =>
  rule.combinedWithId === null && rule.field === "publisherId" && rule.operator === "is" && rule.value.trim() !== "";

type SupportedGroup = {
  filterBy: string;
  missionWhere: Prisma.MissionWhereInput;
};

const reportedUnsupportedRuleKeys = new Set<string>();

const unsupportedRuleKey = (rule: PublisherDiffusionRuleRecord): string =>
  [rule.id, rule.publisherId, rule.combinedWithId ?? "", rule.field, rule.operator, rule.value, rule.combinator].join(":");

const reportUnsupportedRule = (rule: PublisherDiffusionRuleRecord, reason: string) => {
  const key = unsupportedRuleKey(rule);
  if (reportedUnsupportedRuleKeys.has(key)) {
    return;
  }

  reportedUnsupportedRuleKeys.add(key);
  captureException(new Error("[PublisherDiffusionRule] Règle non supportée dans le filtre Typesense des missions"), {
    extra: {
      reason,
      ruleId: rule.id,
      publisherId: rule.publisherId,
      combinedWithId: rule.combinedWithId,
      field: rule.field,
      fieldType: rule.fieldType,
      operator: rule.operator,
      value: rule.value,
      combinator: rule.combinator,
      position: rule.position,
    },
  });
};

const buildChildrenByParentId = (rules: PublisherDiffusionRuleRecord[]): Map<string, PublisherDiffusionRuleRecord[]> => {
  const childrenByParentId = new Map<string, PublisherDiffusionRuleRecord[]>();

  for (const rule of rules) {
    if (!rule.combinedWithId) {
      continue;
    }
    const siblings = childrenByParentId.get(rule.combinedWithId) ?? [];
    siblings.push(rule);
    childrenByParentId.set(rule.combinedWithId, siblings);
  }

  return childrenByParentId;
};

const buildParentOrganizationWhere = (rule: PublisherDiffusionRuleRecord): Prisma.MissionWhereInput | null => {
  const value = rule.value.trim();
  if (!value) {
    return null;
  }

  if (rule.operator === "is") {
    return { publisherOrganization: { parentOrganizations: { has: value } } };
  }

  if (rule.operator === "is_not") {
    return { NOT: { publisherOrganization: { parentOrganizations: { has: value } } } };
  }

  return null;
};

const buildSupportedChildGroup = (rule: PublisherDiffusionRuleRecord): SupportedGroup | null => {
  const value = rule.value.trim();
  if (!value || (rule.operator !== "is" && rule.operator !== "is_not")) {
    reportUnsupportedRule(rule, "unsupported_child_operator_or_empty_value");
    return null;
  }

  const isNot = rule.operator === "is_not";

  if (rule.field === "publisherOrganizationId") {
    return {
      filterBy: `publisherOrganizationId:${isNot ? "!" : ""}=${escapeTypesenseFilterValue(value)}`,
      missionWhere: { publisherOrganizationId: isNot ? { not: value } : value },
    };
  }

  if (rule.field === "publisherOrganization.parentOrganizations") {
    const missionWhere = buildParentOrganizationWhere(rule);
    if (!missionWhere) {
      return null;
    }
    return {
      filterBy: `publisherOrganizationParentOrganizations:${isNot ? "!" : ""}=${escapeTypesenseFilterValue(value)}`,
      missionWhere,
    };
  }

  reportUnsupportedRule(rule, "unsupported_child_field");
  return null;
};

const buildSupportedRuleGroup = (
  rule: PublisherDiffusionRuleRecord,
  childrenByParentId: Map<string, PublisherDiffusionRuleRecord[]>,
  options: { isRoot: boolean }
): SupportedGroup | null => {
  const value = rule.value.trim();
  if (!value) {
    return null;
  }

  const selfGroup: SupportedGroup | null = options.isRoot
    ? {
        filterBy: `publisherId:=${escapeTypesenseFilterValue(value)}`,
        missionWhere: { publisherId: value },
      }
    : buildSupportedChildGroup(rule);

  if (!selfGroup) {
    return null;
  }

  const childGroups = (childrenByParentId.get(rule.id) ?? []).map((child) => buildSupportedRuleGroup(child, childrenByParentId, { isRoot: false }));
  if (childGroups.some((child) => child === null)) {
    return null;
  }

  const supportedChildren = childGroups as SupportedGroup[];
  const parts = [selfGroup.filterBy, ...supportedChildren.map((child) => child.filterBy)];
  const missionWhereParts: Prisma.MissionWhereInput[] = [selfGroup.missionWhere, ...supportedChildren.map((child) => child.missionWhere)];

  return {
    filterBy: parts.length === 1 ? parts[0] : `(${parts.join(" && ")})`,
    missionWhere: missionWhereParts.length === 1 ? missionWhereParts[0] : { AND: missionWhereParts },
  };
};

const dedupeGroups = (groups: SupportedGroup[]): SupportedGroup[] => {
  const seen = new Set<string>();
  return groups.filter((group) => {
    if (seen.has(group.filterBy)) {
      return false;
    }
    seen.add(group.filterBy);
    return true;
  });
};

const getPublisherIdOnlyGroups = (groups: SupportedGroup[]): string[] | null => {
  const publisherIds: string[] = [];

  for (const group of groups) {
    const keys = Object.keys(group.missionWhere);
    const publisherId = (group.missionWhere as { publisherId?: unknown }).publisherId;
    if (keys.length !== 1 || typeof publisherId !== "string") {
      return null;
    }
    publisherIds.push(publisherId);
  }

  return publisherIds;
};

export const publisherDiffusionRulesToMissionFilter = (rules: PublisherDiffusionRuleRecord[]): MissionDiffusionRulesFilter => {
  if (!rules.length) {
    return { kind: "all", missionWhere: null };
  }

  for (const rule of rules) {
    if (rule.combinedWithId === null && !isSupportedPublisherWhitelistRule(rule)) {
      reportUnsupportedRule(rule, "unsupported_root_rule");
    }
  }

  const childrenByParentId = buildChildrenByParentId(rules);
  const groups = dedupeGroups(
    rules
      .filter(isSupportedPublisherWhitelistRule)
      .map((rule) => buildSupportedRuleGroup(rule, childrenByParentId, { isRoot: true }))
      .filter((group: SupportedGroup | null): group is SupportedGroup => Boolean(group))
  );

  if (!groups.length) {
    return { kind: "none", missionWhere: null };
  }

  const publisherIds = getPublisherIdOnlyGroups(groups);
  if (publisherIds && publisherIds.length > 1) {
    return {
      kind: "filter",
      filterBy: buildTypesenseListFilter("publisherId", publisherIds),
      missionWhere: { publisherId: { in: publisherIds } },
    };
  }

  return {
    kind: "filter",
    filterBy: groups.length === 1 ? groups[0].filterBy : `(${groups.map((group) => group.filterBy).join(" || ")})`,
    missionWhere: groups.length === 1 ? groups[0].missionWhere : { OR: groups.map((group) => group.missionWhere) },
  };
};
