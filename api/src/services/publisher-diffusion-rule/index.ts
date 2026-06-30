import { Prisma, PublisherDiffusionRule } from "@/db/core";
import { RESSOURCE_ALREADY_EXIST } from "@/error";
import { missionRepository } from "@/repositories/mission";
import { publisherDiffusionRuleRepository } from "@/repositories/publisher-diffusion-rule";
import type {
  PublisherDiffusionRuleCombinator,
  PublisherDiffusionRuleCreateInput,
  PublisherDiffusionRuleFindParams,
  PublisherDiffusionRuleRecord,
} from "@/types/publisher-diffusion-rule";
import {
  buildMissionPublisherDiffusionRuleConditionFromRule,
  buildMissionPublisherDiffusionRuleSqlFromRules,
  isPublisherDiffusionRuleArrayField,
  optimizeMissionDiffusionRuleWhere,
} from "@/utils/publisher-diffusion-rule-query";

type PublisherDiffusionRuleWithChildren = PublisherDiffusionRule & {
  combinedRules?: PublisherDiffusionRule[];
  combinedWith?: PublisherDiffusionRule | null;
};

type MissionDiffuseurCandidateFilter = {
  where: Prisma.MissionWhereInput;
  publisherIds: string[];
  scopes: Prisma.MissionWhereInput[];
  scopePublisherIds: string[];
};

/**
 * Critères communs des scope roots : une racine par annonceur diffusé
 * (`publisherId` du diffuseur + `value` = id de l'annonceur).
 */
export const DIFFUSION_SCOPE_ROOT_CRITERIA = Object.freeze({ combinedWithId: null, field: "publisherId", operator: "is" } as const);
const IMPOSSIBLE_MISSION_WHERE = Object.freeze({ id: { in: [] } }) satisfies Prisma.MissionWhereInput;

/**
 * Indexe une liste plate de rules par parent : racines (`combinedWithId === null`,
 * une par annonceur) d'un côté, enfants regroupés par `combinedWithId` de l'autre.
 */
const groupRulesByParent = (rules: PublisherDiffusionRule[]): { roots: PublisherDiffusionRule[]; childrenByParentId: Map<string, PublisherDiffusionRule[]> } => {
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

  return { roots, childrenByParentId };
};

/**
 * Condition d'un scope : la condition de la rule combinée en `AND` avec celles de
 * ses enfants (critères/exclusions). Ex. `publisherId === X AND <field op value>`.
 */
const buildScopeCondition = (rule: PublisherDiffusionRule, childrenByParentId: Map<string, PublisherDiffusionRule[]>): Prisma.MissionWhereInput | null => {
  const conditions: Prisma.MissionWhereInput[] = [];

  const selfCondition = buildMissionPublisherDiffusionRuleConditionFromRule(rule);
  if (selfCondition) {
    conditions.push(selfCondition);
  }

  for (const child of childrenByParentId.get(rule.id) ?? []) {
    const childCondition = buildScopeCondition(child, childrenByParentId);
    if (childCondition) {
      conditions.push(childCondition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
};

/**
 * Allowlist des missions diffusables : `OR` des scopes, chaque scope étant un
 * annonceur (`publisherId === X`) combiné à ses critères enfants. `publisherIds`
 * restreint optionnellement aux annonceurs demandés (param `publisher` de la route).
 */
const buildAllowlistFilter = (rules: PublisherDiffusionRule[], publisherIds?: string[]): MissionDiffuseurCandidateFilter => {
  const { roots, childrenByParentId } = groupRulesByParent(rules);

  if (publisherIds?.length) {
    const configuredPublisherIds = roots.filter((root) => root.field === "publisherId" && root.operator === "is").map((root) => root.value);
    if (configuredPublisherIds.length > 0 && !publisherIds.some((id) => configuredPublisherIds.includes(id))) {
      return { where: IMPOSSIBLE_MISSION_WHERE, publisherIds: [], scopes: [], scopePublisherIds: [] };
    }
  }

  const scopeRoots = roots.filter((root) => root.field === "publisherId" && root.operator === "is" && (!publisherIds || publisherIds.includes(root.value)));

  const scopes = scopeRoots
    .map((root) => buildScopeCondition(root, childrenByParentId))
    .filter((scope): scope is Prisma.MissionWhereInput => scope !== null && Object.keys(scope).length > 0);

  const candidatePublisherIds = Array.from(new Set(scopeRoots.map((root) => root.value)));
  const scopePublisherIds = scopeRoots.map((root) => root.value);

  if (scopes.length === 0) {
    return { where: {}, publisherIds: candidatePublisherIds, scopes, scopePublisherIds };
  }
  const where = optimizeMissionDiffusionRuleWhere(scopes.length === 1 ? scopes[0] : { OR: scopes });
  return { where, publisherIds: candidatePublisherIds, scopes, scopePublisherIds };
};

const findOrderedRules = (publisherId: string): Promise<PublisherDiffusionRule[]> =>
  publisherDiffusionRuleRepository.findMany({
    where: { publisherId },
    orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
  });

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
  combinedWith: rule.combinedWith ? toRecord(rule.combinedWith) : null,
});

const EXCLUSION_OPERATORS = new Set(["is_not", "does_not_contain", "does_not_exist"]);

const ruleExcludesValue = (rule: PublisherDiffusionRuleRecord, value: string): boolean => {
  const ruleValue = (rule.value ?? "").toLowerCase();
  const candidate = value.toLowerCase();
  switch (rule.operator) {
    case "is_not":
      return candidate === ruleValue;
    case "does_not_contain":
      // Champs array (ex. parentOrganizations) : appartenance exacte comme le filtrage réel ; champs scalaires : sous-chaîne (ILIKE %...%).
      return isPublisherDiffusionRuleArrayField(rule.field) ? candidate === ruleValue : candidate.includes(ruleValue);
    case "does_not_exist":
      return candidate.length > 0;
    default:
      return false;
  }
};

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
  if (params.operator) {
    where.operator = params.operator;
  }
  if (params.value) {
    where.value = params.value;
  }
  return where;
};

export const publisherDiffusionRuleService = {
  /**
   * Construit le where des missions qu'un diffuseur peut diffuser, sous forme
   * d'allowlist : `OR` des scopes, chaque scope = `publisherId` de l'annonceur
   * `AND` ses critères/exclusions enfants. `publisherIds` restreint optionnellement
   * aux annonceurs demandés (param `publisher` de la route).
   */
  async buildMissionDiffuseurCandidateWhere(publisherId: string, publisherIds?: string[]): Promise<Prisma.MissionWhereInput> {
    const rules = await findOrderedRules(publisherId);
    const { where } = buildAllowlistFilter(rules, publisherIds);
    return where;
  },

  async buildMissionDiffuseurCandidateFilter(publisherId: string, publisherIds?: string[]): Promise<MissionDiffuseurCandidateFilter> {
    const rules = await findOrderedRules(publisherId);
    return buildAllowlistFilter(rules, publisherIds);
  },

  async canPublisherAccessMission({ publisherId, missionId }: { publisherId: string; missionId: string }): Promise<boolean> {
    const rules = await findOrderedRules(publisherId);
    if (rules.length === 0) {
      return true;
    }

    const { where: diffusionRuleWhere } = buildAllowlistFilter(rules);
    if (Object.keys(diffusionRuleWhere).length === 0) {
      return false;
    }

    const count = await missionRepository.count({ AND: [{ id: missionId }, diffusionRuleWhere] });

    return count > 0;
  },

  async buildMissionPublisherDiffusionRuleSql(publisherId: string, options: { missionAlias?: string } = {}): Promise<Prisma.Sql> {
    const rules = await publisherDiffusionRuleRepository.findMany({
      where: { publisherId },
      orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
    });

    return buildMissionPublisherDiffusionRuleSqlFromRules(rules, options);
  },

  isValueDiffused({ rules, field, value }: { rules: PublisherDiffusionRuleRecord[]; field: string; value: string }): boolean {
    return !rules.some((rule) => rule.field === field && EXCLUSION_OPERATORS.has(rule.operator) && ruleExcludesValue(rule, value));
  },

  async findRules(params: PublisherDiffusionRuleFindParams = {}, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRuleRecord[]> {
    const rules = (await publisherDiffusionRuleRepository.findMany(
      {
        where: buildFindWhere(params),
        include: params.includeCombinedRules ? { combinedRules: true } : undefined,
        orderBy: [{ position: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
      },
      tx
    )) as PublisherDiffusionRuleWithChildren[];

    return rules.map(toRecord);
  },

  async findRuleById(id: string): Promise<PublisherDiffusionRuleRecord | null> {
    const rule = (await publisherDiffusionRuleRepository.findUnique({
      where: { id },
      include: { combinedRules: true, combinedWith: true },
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

  async findOrCreateScopeRoot(diffuseurPublisherId: string, annonceurPublisherId: string, tx?: Prisma.TransactionClient): Promise<PublisherDiffusionRuleRecord> {
    const rootWhere = { publisherId: diffuseurPublisherId, ...DIFFUSION_SCOPE_ROOT_CRITERIA, value: annonceurPublisherId };

    const existing = await publisherDiffusionRuleRepository.findFirst({ where: rootWhere, include: { combinedRules: true } }, tx);
    if (existing) {
      return toRecord(existing as PublisherDiffusionRuleWithChildren);
    }

    try {
      const created = (await publisherDiffusionRuleRepository.create(
        {
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
        },
        tx
      )) as PublisherDiffusionRuleWithChildren;

      return toRecord(created);
    } catch (error) {
      // Course concurrente : un autre process a créé le root entre-temps (rejeté par l'index unique partiel sur les roots).
      if ((error as { code?: string }).code === "P2002") {
        const root = await publisherDiffusionRuleRepository.findFirst({ where: rootWhere, include: { combinedRules: true } }, tx);
        if (root) {
          return toRecord(root as PublisherDiffusionRuleWithChildren);
        }
      }
      throw error;
    }
  },

  /**
   * Aligne les scope roots d'un diffuseur sur la liste d'annonceurs demandée, par
   * diff : suppression ciblée des roots retirés (cascade DB sur leurs rules enfants)
   * et création des manquants. Pas de delete+recreate global, pour préserver les
   * rules enfants (ex. exclusions d'organisations) des roots conservés.
   */
  async syncScopeRoots(diffuseurPublisherId: string, annonceurPublisherIds: string[], tx?: Prisma.TransactionClient): Promise<void> {
    const roots = await this.findRules({ publisherId: diffuseurPublisherId, ...DIFFUSION_SCOPE_ROOT_CRITERIA }, tx);
    const desired = new Set(annonceurPublisherIds);
    const existing = new Set(roots.map((root) => root.value));

    for (const root of roots) {
      if (!desired.has(root.value)) {
        await this.deleteRule(root.id, tx);
      }
    }
    for (const annonceurPublisherId of annonceurPublisherIds) {
      if (!existing.has(annonceurPublisherId)) {
        await this.findOrCreateScopeRoot(diffuseurPublisherId, annonceurPublisherId, tx);
      }
    }
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

    const existing = await publisherDiffusionRuleRepository.findFirst({
      where: { publisherId: input.diffuseurPublisherId, combinedWithId: root.id, field: input.field, value: input.value },
      include: { combinedRules: true },
    });
    if (existing) {
      // Idempotent uniquement si la règle est réellement identique. Sinon on refuse explicitement au lieu de
      // renvoyer silencieusement une règle qui ne correspond pas à la demande (clé unique sur field + value).
      const isSameRule = existing.operator === input.operator && (existing.fieldType ?? null) === (input.fieldType ?? null);
      if (isSameRule) {
        return toRecord(existing as PublisherDiffusionRuleWithChildren);
      }
      const conflict = new Error(`A diffusion rule already exists for field "${input.field}" and value "${input.value}" with a different operator`) as Error & {
        code: string;
        status: number;
      };
      conflict.code = RESSOURCE_ALREADY_EXIST;
      conflict.status = 409;
      throw conflict;
    }

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

  async deleteRule(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await publisherDiffusionRuleRepository.delete({ where: { id } }, tx);
  },

  async deleteRules(params: PublisherDiffusionRuleFindParams): Promise<number> {
    const result = await publisherDiffusionRuleRepository.deleteMany({
      where: buildFindWhere(params),
    });
    return result.count;
  },
};

export default publisherDiffusionRuleService;
