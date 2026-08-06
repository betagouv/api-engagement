import { PUBLISHER_IDS } from "@/config";
import publisherDiffusionRuleService, { DIFFUSION_SCOPE_ROOT_CRITERIA } from "@/services/publisher-diffusion-rule";
import publisherOrganizationService from "@/services/publisher-organization";
import {
  buildSearchBooleanFilter,
  buildSearchEqualFilter,
  buildSearchListFilter,
  buildSearchNotEqualFilter,
  buildSearchNotListFilter,
  buildSearchPrefixFilter,
  combineSearchAnd,
  combineSearchOr,
} from "@/services/search/filter";
import type { OrgArrayColumn } from "@/types/publisher-organization";
import type { WidgetRecord, WidgetRuleRecord } from "@/types/widget";

type WidgetRule = Pick<WidgetRuleRecord, "field" | "operator" | "value">;

const NEVER_FILTER = "publisherId:=`__never__`";
const ARRAY_FIELDS = new Set(["tags"]);
const ORG_ARRAY_FIELDS = new Map<string, OrgArrayColumn>([
  ["parentOrganization", "parent_organizations"],
  ["organizationActions", "actions"],
  ["associationReseaux", "parent_organizations"],
  ["organizationNetwork", "parent_organizations"],
  ["organizationReseaux", "parent_organizations"],
] as const);
const ORG_NAME_FIELDS = new Set(["organizationName", "associationName"]);
const FIELD_MAP: Record<string, string> = {
  domain: "mission_domain",
  activity: "activities",
  postalCode: "postalCodes",
  departmentName: "departmentNames",
  regionName: "regionNames",
  tags: "tags",
  title: "title",
  openToMinors: "openToMinors",
};

export const isWidgetRuleSupported = (rule: WidgetRule): boolean => {
  if (!rule.value.trim()) {
    return false;
  }

  if (ORG_ARRAY_FIELDS.has(rule.field)) {
    return ["is", "is_not", "contains", "does_not_contain"].includes(rule.operator);
  }
  if (ORG_NAME_FIELDS.has(rule.field)) {
    return ["is", "is_not", "contains", "does_not_contain", "starts_with"].includes(rule.operator);
  }

  const field = FIELD_MAP[rule.field];
  if (!field) {
    return false;
  }
  if (field === "openToMinors") {
    return normalizeBoolean(rule.value) !== null && ["is", "is_not"].includes(rule.operator);
  }
  if (ARRAY_FIELDS.has(rule.field)) {
    return ["is", "contains"].includes(rule.operator);
  }
  return ["is", "is_not", "contains", "starts_with"].includes(rule.operator);
};

const normalizeBoolean = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0"].includes(normalized)) {
    return false;
  }
  return null;
};

const buildOrganizationArrayRule = async (rule: WidgetRuleRecord, column: OrgArrayColumn): Promise<string> => {
  const operator = rule.operator === "is" ? "contains" : rule.operator === "is_not" ? "does_not_contain" : rule.operator;
  if (operator !== "contains" && operator !== "does_not_contain") {
    return NEVER_FILTER;
  }
  const ids = await publisherOrganizationService.findIdsMatchingArrayValue(column, rule.value);
  if (!ids.length) {
    return operator === "does_not_contain" ? "" : NEVER_FILTER;
  }
  return operator === "does_not_contain" ? buildSearchNotListFilter("publisherOrganizationId", ids) : buildSearchListFilter("publisherOrganizationId", ids);
};

const buildOrganizationNameRule = async (rule: WidgetRuleRecord): Promise<string> => {
  const operator = {
    is: "is",
    is_not: "is",
    contains: "contains",
    does_not_contain: "contains",
    starts_with: "starts_with",
  }[rule.operator] as "is" | "contains" | "starts_with" | undefined;
  if (!operator) {
    return NEVER_FILTER;
  }
  const ids = await publisherOrganizationService.findIdsMatchingName(operator, rule.value);
  const negative = rule.operator === "is_not" || rule.operator === "does_not_contain";
  if (!ids.length) {
    return negative ? "" : NEVER_FILTER;
  }
  return negative ? buildSearchNotListFilter("publisherOrganizationId", ids) : buildSearchListFilter("publisherOrganizationId", ids);
};

const buildRule = async (rule: WidgetRuleRecord): Promise<string> => {
  if (!isWidgetRuleSupported(rule)) {
    return NEVER_FILTER;
  }

  const organizationColumn = ORG_ARRAY_FIELDS.get(rule.field);
  if (organizationColumn) {
    return buildOrganizationArrayRule(rule, organizationColumn);
  }
  if (ORG_NAME_FIELDS.has(rule.field)) {
    return buildOrganizationNameRule(rule);
  }

  const field = FIELD_MAP[rule.field];
  if (!field) {
    return NEVER_FILTER;
  }
  const operator = ARRAY_FIELDS.has(rule.field) ? (rule.operator === "is" ? "contains" : rule.operator === "is_not" ? "does_not_contain" : rule.operator) : rule.operator;

  if (field === "openToMinors") {
    const value = normalizeBoolean(rule.value);
    if (value === null || !["is", "is_not"].includes(operator)) {
      return NEVER_FILTER;
    }
    return operator === "is_not" ? buildSearchBooleanFilter(field, !value) : buildSearchBooleanFilter(field, value);
  }

  switch (operator) {
    case "is":
      return buildSearchEqualFilter(field, rule.value);
    case "is_not":
      return buildSearchNotEqualFilter(field, rule.value);
    case "contains":
      if (ARRAY_FIELDS.has(rule.field)) {
        return buildSearchEqualFilter(field, rule.value);
      }
      // Les règles texte historiques sont des recherches de mots. Le préfixe couvre
      return buildSearchPrefixFilter(field, rule.value);
    case "does_not_contain":
      return NEVER_FILTER;
    case "starts_with":
      return buildSearchPrefixFilter(field, rule.value);
    case "is_greater_than":
    case "is_less_than":
      return NEVER_FILTER;
    default:
      // Les champs optionnels absents ne sont pas représentés dans Typesense. Les règles
      // d'existence historiques sont auditées séparément avant activation d'un widget.
      return NEVER_FILTER;
  }
};

const buildRulesFilter = async (rules: WidgetRuleRecord[]): Promise<string | undefined> => {
  const and: string[] = [];
  const or: string[] = [];

  const parts = await Promise.all(rules.map(buildRule));
  for (const [index, part] of parts.entries()) {
    if (!part) {
      continue;
    }
    const combinator = index === 0 && rules.length > 1 ? rules[1].combinator : rules[index].combinator;
    (combinator === "and" ? and : or).push(part);
  }

  const groups = [...(and.length ? [combineSearchAnd(and)] : []), ...(or.length ? [combineSearchOr(or)] : [])];
  return groups.length ? combineSearchAnd(groups) : undefined;
};

const buildEligibilityFilter = async (widget: WidgetRecord): Promise<string | undefined> => {
  if (!widget.publishers.length) {
    return undefined;
  }

  const roots = await publisherDiffusionRuleService.findRules({
    publisherId: widget.fromPublisherId,
    ...DIFFUSION_SCOPE_ROOT_CRITERIA,
  });
  const snapshotPublisherIds = new Set([...roots.map((root) => root.value), widget.fromPublisherId]);
  const publishersWithSnapshot = widget.publishers.filter((publisherId) => snapshotPublisherIds.has(publisherId));
  const publishersWithFallback = widget.publishers.filter((publisherId) => !snapshotPublisherIds.has(publisherId));
  const alternatives: string[] = [];

  if (publishersWithSnapshot.length) {
    alternatives.push(combineSearchAnd([buildSearchListFilter("publisherId", publishersWithSnapshot), buildSearchEqualFilter("distributionPublisherIds", widget.fromPublisherId)]));
  }
  if (publishersWithFallback.length) {
    alternatives.push(buildSearchListFilter("publisherId", publishersWithFallback));
  }

  return alternatives.length ? combineSearchOr(alternatives) : undefined;
};

const buildModerationFilter = (widget: WidgetRecord): string | undefined => {
  if (!widget.jvaModeration) {
    return undefined;
  }
  const jvaPublisherFilter = buildSearchEqualFilter("publisherId", PUBLISHER_IDS.JEVEUXAIDER);
  const moderatedPublisherFilter = combineSearchAnd([
    buildSearchNotEqualFilter("publisherId", PUBLISHER_IDS.JEVEUXAIDER),
    buildSearchEqualFilter("moderationAcceptedPublisherIds", PUBLISHER_IDS.JEVEUXAIDER),
  ]);
  return combineSearchOr([jvaPublisherFilter, moderatedPublisherFilter]);
};

export const buildWidgetBaseFilter = async (widget: WidgetRecord): Promise<string> => {
  const eligibility = await buildEligibilityFilter(widget);
  const rules = await buildRulesFilter(widget.rules);
  const moderation = buildModerationFilter(widget);
  const parts = [eligibility, rules, moderation].filter((part): part is string => Boolean(part));
  return parts.length ? combineSearchAnd(parts) : "";
};
