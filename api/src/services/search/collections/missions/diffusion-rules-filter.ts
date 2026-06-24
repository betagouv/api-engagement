import type { Prisma } from "@/db/core";
import { captureException } from "@/error";
import type { ChildFieldConfig, ChildPolarity } from "@/services/publisher-diffusion-rule/config";
import { SUPPORTED_CHILD_FIELDS } from "@/services/publisher-diffusion-rule/config";
import { buildSearchEqualFilter, buildSearchListFilter, buildSearchNotEqualFilter, combineSearchAnd, combineSearchOr } from "@/services/search/filter";
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
  captureException(new Error("[PublisherDiffusionRule] Règle non supportée dans le filtre de recherche des missions"), {
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

const resolveChildPolarity = (config: ChildFieldConfig, operator: string): ChildPolarity | null => {
  if (config.operators.is.includes(operator)) {
    return "is";
  }
  if (config.operators.isNot.includes(operator)) {
    return "isNot";
  }
  return null;
};

const buildSupportedChildGroup = (rule: PublisherDiffusionRuleRecord): SupportedGroup | null => {
  const value = rule.value.trim();
  if (!value) {
    reportUnsupportedRule(rule, "unsupported_child_operator_or_empty_value");
    return null;
  }

  const config = SUPPORTED_CHILD_FIELDS[rule.field];
  if (!config) {
    reportUnsupportedRule(rule, "unsupported_child_field");
    return null;
  }

  const polarity = resolveChildPolarity(config, rule.operator);
  if (!polarity) {
    reportUnsupportedRule(rule, "unsupported_child_operator_or_empty_value");
    return null;
  }

  return {
    filterBy: polarity === "isNot" ? buildSearchNotEqualFilter(config.indexField, value) : buildSearchEqualFilter(config.indexField, value),
    missionWhere: config.missionWhere[polarity](value),
  };
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
        filterBy: buildSearchEqualFilter("publisherId", value),
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
    filterBy: combineSearchAnd(parts),
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

const getPublisherIdOnly = (group: SupportedGroup): string | null => {
  const keys = Object.keys(group.missionWhere);
  const publisherId = (group.missionWhere as { publisherId?: unknown }).publisherId;
  return keys.length === 1 && typeof publisherId === "string" ? publisherId : null;
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

  // On compacte les groupes « publisherId seul » en une unique liste `publisherId:=[…]` plutôt qu'une
  // chaîne de `||` : cela borne à la fois la longueur du filter_by et son nombre d'opérations (Typesense
  // en limite respectivement la query string à 4000 caractères et le filter_by à 100 opérations). Les
  // groupes avec enfants (restrictions sur l'organisation) ne peuvent pas être compactés : on les laisse
  // en OR à côté de la liste.
  const purePublisherIds: string[] = [];
  const childGroups: SupportedGroup[] = [];
  for (const group of groups) {
    const publisherId = getPublisherIdOnly(group);
    if (publisherId !== null) {
      purePublisherIds.push(publisherId);
    } else {
      childGroups.push(group);
    }
  }

  if (childGroups.length === 0) {
    return purePublisherIds.length === 1
      ? { kind: "filter", filterBy: buildSearchEqualFilter("publisherId", purePublisherIds[0]), missionWhere: { publisherId: purePublisherIds[0] } }
      : { kind: "filter", filterBy: buildSearchListFilter("publisherId", purePublisherIds), missionWhere: { publisherId: { in: purePublisherIds } } };
  }

  const filterParts: string[] = [];
  const missionWhereParts: Prisma.MissionWhereInput[] = [];
  if (purePublisherIds.length === 1) {
    filterParts.push(buildSearchEqualFilter("publisherId", purePublisherIds[0]));
    missionWhereParts.push({ publisherId: purePublisherIds[0] });
  } else if (purePublisherIds.length > 1) {
    filterParts.push(buildSearchListFilter("publisherId", purePublisherIds));
    missionWhereParts.push({ publisherId: { in: purePublisherIds } });
  }
  for (const group of childGroups) {
    filterParts.push(group.filterBy);
    missionWhereParts.push(group.missionWhere);
  }

  return {
    kind: "filter",
    filterBy: combineSearchOr(filterParts),
    missionWhere: missionWhereParts.length === 1 ? missionWhereParts[0] : { OR: missionWhereParts },
  };
};
