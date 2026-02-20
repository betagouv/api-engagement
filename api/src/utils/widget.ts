import { Prisma } from "@/db/core";
import { WidgetRuleRecord } from "@/types/widget";

export const WIDGET_RULE_FIELDS = [
  { label: "Nom de l'organisation", value: "organizationName", type: "text" },
  { label: "Domaine de la mission", value: "domain", type: "text" },
  { label: "Nom du réseau", value: "organizationReseaux", type: "text" },
  { label: "Titre de la mission", value: "title", type: "text" },
  { label: "Code postal de la mission", value: "postalCode", type: "text" },
  { label: "Département de la mission", value: "departmentName", type: "text" },
  { label: "Région de la mission", value: "regionName", type: "text" },
  { label: "Activité de la mission", value: "activity", type: "text" },
  { label: "Tag personnalisé", value: "tags", type: "text" },
  { label: "Actions de l'organisation", value: "organizationActions", type: "text" },
  { label: "Ouvert au mineur", value: "openToMinors", type: "boolean" },
];

type WidgetRule = Pick<WidgetRuleRecord, "field" | "operator" | "value" | "combinator">;

/**
 * Champs qui correspondent à des tableaux (String[]) dans Prisma.
 * Pour ces champs, on utilise `has`/`hasSome` au lieu de `contains`.
 */
const ARRAY_FIELDS = new Set(["associationReseaux", "organizationActions", "organizationNetwork", "organizationReseaux", "tags"]);

/**
 * Mapping des champs virtuels (utilisés dans les règles widget) vers les chemins Prisma réels.
 * Les champs non listés ici sont utilisés directement sur le modèle Mission.
 */
const FIELD_TO_PRISMA_PATH: Record<string, (condition: any) => Prisma.MissionWhereInput> = {
  domain: (condition) => ({ domain: { is: { name: condition } } }),
  activity: (condition) => ({ activities: { some: { activity: { name: condition } } } }),
  postalCode: (condition) => ({ addresses: { some: { postalCode: condition } } }),
  departmentName: (condition) => ({ addresses: { some: { departmentName: condition } } }),
  regionName: (condition) => ({ addresses: { some: { region: condition } } }),
  associationName: (condition) => ({ publisherOrganization: { is: { organizationName: condition } } }),
  associationReseaux: (condition) => ({ publisherOrganization: { is: { organizationReseaux: condition } } }),
  organizationName: (condition) => ({ publisherOrganization: { is: { organizationName: condition } } }),
  organizationNetwork: (condition) => ({ publisherOrganization: { is: { organizationReseaux: condition } } }),
  organizationReseaux: (condition) => ({ publisherOrganization: { is: { organizationReseaux: condition } } }),
  organizationActions: (condition) => ({ publisherOrganization: { is: { organizationActions: condition } } }),
};

/**
 * Construit une condition Prisma pour une règle donnée.
 * Gère les opérateurs : is, is_not, contains, does_not_contain, is_greater_than, is_less_than, exists, does_not_exist, starts_with
 */
const buildRuleCondition = (rule: WidgetRule): Prisma.MissionWhereInput | null => {
  const { field, operator, value } = rule;
  const normalizedValue = field === "openToMinors" ? normalizeBooleanValue(value) : value;

  // Pour exists/does_not_exist, pas besoin de valeur
  if (operator !== "exists" && operator !== "does_not_exist" && !normalizedValue) {
    return null;
  }

  const isArrayField = ARRAY_FIELDS.has(field);

  // Construit la condition de base selon l'opérateur
  let condition: any;
  switch (operator) {
    case "is":
      // Pour un tableau, "is" signifie "contient exactement cette valeur"
      condition = isArrayField ? { has: normalizedValue } : normalizedValue;
      break;
    case "is_not":
      condition = { not: normalizedValue };
      break;
    case "contains":
      // Pour un tableau, utiliser `has` au lieu de `contains`
      condition = isArrayField ? { has: `${normalizedValue}` } : { contains: normalizedValue, mode: "insensitive" };
      break;
    case "does_not_contain":
      // Cas spécial : on wrappe dans NOT après le mapping
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

  const extractPublisherOrganizationCondition = (
    condition: Prisma.MissionWhereInput
  ): Prisma.PublisherOrganizationWhereInput | null => {
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
