import { Prisma } from "@/db/core";
import { WidgetRuleRecord } from "@/types/widget";

type WidgetRule = Pick<WidgetRuleRecord, "field" | "operator" | "value" | "combinator">;

/**
 * LEGACY ARRAY FIELDS to be removed after migration
 */
const ARRAY_FIELDS = new Set(["organizationActions", "parentOrganization", "tags", "associationReseaux", "organizationNetwork", "organizationReseaux"]);

/**
 * Mapping des champs virtuels (utilisés dans les règles widget) vers les chemins Prisma réels.
 * Les champs non listés ici sont utilisés directement sur le modèle Mission.
 */
const FIELD_TO_PRISMA_PATH: Record<string, (condition: any) => Prisma.MissionWhereInput> = {
  domain: (condition) => ({ domain: { name: condition } }),
  activity: (condition) => ({ activities: { some: { activity: { name: condition } } } }),
  postalCode: (condition) => ({ addresses: { some: { postalCode: condition } } }),
  departmentName: (condition) => ({ addresses: { some: { departmentName: condition } } }),
  regionName: (condition) => ({ addresses: { some: { region: condition } } }),
  organizationName: (condition) => ({ publisherOrganization: { name: condition } }),
  parentOrganization: (condition) => ({ publisherOrganization: { parentOrganizations: condition } }),
  organizationActions: (condition) => ({ publisherOrganization: { actions: condition } }),
  // LEGACY FIELDS to be removed after migration
  associationName: (condition) => ({ publisherOrganization: { name: condition } }),
  associationReseaux: (condition) => ({ publisherOrganization: { parentOrganizations: condition } }),
  organizationNetwork: (condition) => ({ publisherOrganization: { parentOrganizations: condition } }),
  organizationReseaux: (condition) => ({ publisherOrganization: { parentOrganizations: condition } }),
};

/**
 * LEGACY OPERATORS to be removed after migration
 * - "is" → "contains"
 * - "is_not" → "does_not_contain"
 */
const normalizeArrayOperator = (operator: string): string => {
  switch (operator) {
    case "is":
      return "contains";
    case "is_not":
      return "does_not_contain";
    default:
      return operator;
  }
};

/**
 * Construit une condition Prisma pour une règle donnée.
 *
 * Opérateurs pour les champs texte : is, is_not, contains, does_not_contain, starts_with, exists, does_not_exist,
 *   is_greater_than, is_less_than
 * Opérateurs pour les champs tableau (array) : contains, does_not_contain
 *   → l'insensibilité à la casse n'est pas possible sur ces champs
 */
const buildRuleCondition = (rule: WidgetRule): Prisma.MissionWhereInput | null => {
  const { field, value } = rule;
  const normalizedValue = field === "openToMinors" ? normalizeBooleanValue(value) : value;
  const isArrayField = ARRAY_FIELDS.has(field);

  // LEGACY OPERATORS to be removed after migration
  const operator = isArrayField ? normalizeArrayOperator(rule.operator) : rule.operator;

  if (operator !== "exists" && operator !== "does_not_exist" && !normalizedValue) {
    return null;
  }

  // Construit la condition de base selon l'opérateur
  let condition: any;
  switch (operator) {
    case "is":
      condition = normalizedValue;
      break;
    case "is_not":
      condition = { not: normalizedValue };
      break;
    case "contains":
      condition = isArrayField ? { has: `${normalizedValue}` } : { contains: normalizedValue, mode: "insensitive" };
      break;
    case "does_not_contain":
      condition = isArrayField ? { has: `${normalizedValue}` } : { contains: normalizedValue, mode: "insensitive" };
      break;
    case "is_greater_than":
      condition = { gt: normalizedValue };
      break;
    case "is_less_than":
      condition = { lt: normalizedValue };
      break;
    case "exists":
      condition = { not: null };
      break;
    case "does_not_exist":
      condition = null;
      break;
    case "starts_with":
      condition = { startsWith: normalizedValue, mode: "insensitive" };
      break;
    default:
      return null;
  }

  // Applique le mapping vers le chemin Prisma réel
  const mapper = FIELD_TO_PRISMA_PATH[field];
  let result: Prisma.MissionWhereInput;

  if (mapper) {
    result = mapper(condition);
  } else {
    result = { [field]: condition };
  }

  // Pour does_not_contain, on wrappe le résultat dans NOT
  if (operator === "does_not_contain") {
    return { NOT: result };
  }

  return result;
};

const normalizeBooleanValue = (value?: string | null) => {
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

/**
 * Applique les règles du widget pour construire un objet Prisma.MissionWhereInput.
 * Les règles sont combinées avec AND ou OR selon le combinator de chaque règle.
 */
export const applyWidgetRules = (rules: WidgetRule[]): Prisma.MissionWhereInput => {
  if (!rules.length) {
    return {};
  }

  const andConditions: Prisma.MissionWhereInput[] = [];
  const orConditions: Prisma.MissionWhereInput[] = [];
  const publisherOrganizationAnd: Prisma.PublisherOrganizationWhereInput[] = [];
  const publisherOrganizationOr: Prisma.PublisherOrganizationWhereInput[] = [];

  const extractPublisherOrganizationCondition = (condition: Prisma.MissionWhereInput): Prisma.PublisherOrganizationWhereInput | null => {
    const keys = Object.keys(condition);
    if (keys.length !== 1 || keys[0] !== "publisherOrganization") {
      return null;
    }
    const publisherOrganization = (condition as { publisherOrganization?: { is?: unknown } }).publisherOrganization;
    if (!publisherOrganization || typeof publisherOrganization !== "object" || !("is" in publisherOrganization)) {
      return null;
    }
    const inner = publisherOrganization.is;
    if (!inner || typeof inner !== "object") {
      return null;
    }
    return inner as Prisma.PublisherOrganizationWhereInput;
  };

  rules.forEach((rule, index) => {
    const condition = buildRuleCondition(rule);
    if (!condition) {
      return;
    }

    // Pour la première règle avec plusieurs règles, utiliser le combinator de la deuxième règle
    let combinator = rule.combinator;
    if (index === 0 && rules.length > 1) {
      combinator = rules[1].combinator;
    }

    const publisherOrganizationCondition = extractPublisherOrganizationCondition(condition);
    if (publisherOrganizationCondition) {
      if (combinator === "and") {
        publisherOrganizationAnd.push(publisherOrganizationCondition);
      } else if (combinator === "or") {
        publisherOrganizationOr.push(publisherOrganizationCondition);
      }
      return;
    }

    if (combinator === "and") {
      andConditions.push(condition);
      return;
    }
    if (combinator === "or") {
      orConditions.push(condition);
    }
  });

  if (publisherOrganizationAnd.length) {
    andConditions.push({
      publisherOrganization: {
        is: publisherOrganizationAnd.length === 1 ? publisherOrganizationAnd[0] : { AND: publisherOrganizationAnd },
      },
    });
  }

  if (publisherOrganizationOr.length) {
    orConditions.push({
      publisherOrganization: {
        is: publisherOrganizationOr.length === 1 ? publisherOrganizationOr[0] : { OR: publisherOrganizationOr },
      },
    });
  }

  const result: Prisma.MissionWhereInput = {};

  if (andConditions.length > 0) {
    result.AND = andConditions;
  }

  if (orConditions.length > 0) {
    result.OR = orConditions;
  }

  return result;
};
