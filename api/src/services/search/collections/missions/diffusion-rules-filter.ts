import type { Prisma } from "@/db/core";
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

const isSupportedPublisherWhitelistRule = (rule: PublisherDiffusionRuleRecord): boolean =>
  rule.combinedWithId === null && rule.field === "publisherId" && rule.operator === "is" && rule.value.trim() !== "";

type SupportedGroup = {
  filterBy: string;
  missionWhere: Prisma.MissionWhereInput;
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

  return null;
};

const buildSupportedRootGroup = (root: PublisherDiffusionRuleRecord, children: PublisherDiffusionRuleRecord[]): SupportedGroup | null => {
  const publisherId = root.value.trim();
  if (!publisherId) {
    return null;
  }

  const childGroups = children.map(buildSupportedChildGroup);
  if (childGroups.some((child) => child === null)) {
    return null;
  }

  const parts = [`publisherId:=${escapeTypesenseFilterValue(publisherId)}`, ...(childGroups as SupportedGroup[]).map((child) => child.filterBy)];
  const missionWhereParts: Prisma.MissionWhereInput[] = [{ publisherId }, ...(childGroups as SupportedGroup[]).map((child) => child.missionWhere)];

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

export const publisherDiffusionRulesToMissionFilter = (rules: PublisherDiffusionRuleRecord[]): MissionDiffusionRulesFilter => {
  if (!rules.length) {
    return { kind: "all", missionWhere: null };
  }

  const childrenByParentId = buildChildrenByParentId(rules);
  const groups = dedupeGroups(
    rules
      .filter(isSupportedPublisherWhitelistRule)
      .map((rule) => buildSupportedRootGroup(rule, childrenByParentId.get(rule.id) ?? []))
      .filter((group: SupportedGroup | null): group is SupportedGroup => Boolean(group))
  );

  if (!groups.length) {
    return { kind: "none", missionWhere: null };
  }

  return {
    kind: "filter",
    filterBy: groups.length === 1 ? groups[0].filterBy : `(${groups.map((group) => group.filterBy).join(" || ")})`,
    missionWhere: groups.length === 1 ? groups[0].missionWhere : { OR: groups.map((group) => group.missionWhere) },
  };
};
