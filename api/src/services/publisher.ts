import { randomBytes, randomUUID } from "crypto";

import { MissionType, Prisma, Publisher } from "@/db/core";
import { publisherRepository } from "@/repositories/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import {
  PublisherCreateInput,
  PublisherDiffusionInput,
  PublisherDiffusionRecord,
  PublisherMissionType,
  PublisherRecord,
  PublisherRecordWithRelations,
  PublisherSearchParams,
  PublisherUpdatePatch,
} from "@/types/publisher";
import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";
import { normalizeCollection, normalizeOptionalString } from "@/utils";
export class PublisherNotFoundError extends Error {
  constructor(id: string) {
    super(`Publisher ${id} not found`);
    this.name = "PublisherNotFoundError";
  }
}

export const publisherService = (() => {
  // Critères des scope roots de diffusion : une racine par partenaire diffusé (cf. publisherDiffusionRuleService).
  const DIFFUSION_SCOPE_ROOT_PARAMS = Object.freeze({ combinedWithId: null, field: "publisherId", operator: "is" });

  type DiffusionPartnerInfo = { name: string; moderator: boolean; missionType: PublisherMissionType | null };

  const getPartnerInfoMap = async (partnerIds: string[]): Promise<Map<string, DiffusionPartnerInfo>> => {
    if (!partnerIds.length) {
      return new Map();
    }
    const partners = await publisherRepository.findMany({
      where: { id: { in: Array.from(new Set(partnerIds)) } },
      select: { id: true, name: true, moderator: true, missionType: true },
    });
    return new Map(
      partners.map((partner) => [partner.id, { name: partner.name, moderator: partner.moderator, missionType: (partner.missionType as PublisherMissionType) ?? null }])
    );
  };

  /**
   * `publishers[]` est dérivé des scope roots de publisher_diffusion_rule :
   * rule.publisherId = propriétaire de la liste (diffuseur), rule.value = partenaire
   * diffusé. `moderator`/`missionType` proviennent du publisher partenaire.
   */
  const toDiffusionRecord = (rule: PublisherDiffusionRuleRecord, partner?: DiffusionPartnerInfo): PublisherDiffusionRecord => ({
    id: rule.id,
    diffuseurPublisherId: rule.value,
    diffuseurPublisherName: partner?.name ?? null,
    annonceurPublisherId: rule.publisherId,
    moderator: partner?.moderator ?? false,
    missionType: partner?.missionType ?? null,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  });

  const toPublisherRecord = (publisher: Publisher, diffusions: PublisherDiffusionRecord[]): PublisherRecordWithRelations => ({
    _id: publisher.id,
    id: publisher.id,
    name: publisher.name,
    category: publisher.category ?? null,
    url: publisher.url ?? null,
    moderator: publisher.moderator,
    moderatorLink: publisher.moderatorLink ?? null,
    email: publisher.email ?? null,
    documentation: publisher.documentation ?? null,
    logo: publisher.logo ?? null,
    defaultMissionLogo: publisher.defaultMissionLogo ?? null,
    lead: publisher.lead ?? null,
    feed: publisher.feed ?? null,
    feedUsername: publisher.feedUsername ?? null,
    feedPassword: publisher.feedPassword ?? null,
    apikey: publisher.apikey ?? null,
    description: publisher.description ?? "",
    missionType: (publisher.missionType as PublisherMissionType) ?? null,
    isAnnonceur: publisher.isAnnonceur,
    selfHostedScript: publisher.selfHostedScript,
    hasApiRights: publisher.hasApiRights,
    hasWidgetRights: publisher.hasWidgetRights,
    hasCampaignRights: publisher.hasCampaignRights,
    sendReport: publisher.sendReport,
    sendReportTo: publisher.sendReportTo ?? [],
    deletedAt: publisher.deletedAt ?? null,
    createdAt: publisher.createdAt,
    updatedAt: publisher.updatedAt,
    publishers: diffusions,
  });

  const toPublisherRecords = async (publishers: Publisher[]): Promise<PublisherRecordWithRelations[]> => {
    if (!publishers.length) {
      return [];
    }

    const roots = await publisherDiffusionRuleService.findRules({ publisherIds: publishers.map((publisher) => publisher.id), ...DIFFUSION_SCOPE_ROOT_PARAMS });
    const partnerInfoMap = await getPartnerInfoMap(roots.map((rule) => rule.value));

    const diffusionsByPublisherId = new Map<string, PublisherDiffusionRecord[]>();
    for (const rule of roots) {
      const records = diffusionsByPublisherId.get(rule.publisherId) ?? [];
      records.push(toDiffusionRecord(rule, partnerInfoMap.get(rule.value)));
      diffusionsByPublisherId.set(rule.publisherId, records);
    }

    return publishers.map((publisher) => toPublisherRecord(publisher, diffusionsByPublisherId.get(publisher.id) ?? []));
  };

  const toPublisherRecordWithDiffusions = async (publisher: Publisher): Promise<PublisherRecordWithRelations> => (await toPublisherRecords([publisher]))[0];

  /**
   * Normalise la liste de diffusions entrante en ids de partenaires dédupliqués.
   * `moderator`/`missionType` de l'input sont ignorés : ils sont dérivés du
   * publisher partenaire à la lecture (cf. toDiffusionRecord).
   */
  const normalizeDiffusionPartnerIds = (publishers?: PublisherDiffusionInput[] | null): string[] =>
    normalizeCollection(
      publishers,
      (diffusion) => {
        const publisherId = (diffusion.diffuseurPublisherId ?? diffusion.publisherId)?.trim();
        return publisherId || null;
      },
      {
        key: (publisherId) => publisherId,
      }
    );

  /**
   * Aligne les scope roots du publisher sur la liste de partenaires demandée, par
   * diff : suppression ciblée des roots retirés (cascade DB sur leurs rules enfants)
   * et création des manquants. Pas de delete+recreate global, pour préserver les
   * rules enfants (ex. exclusions d'organisations) des roots conservés.
   */
  const syncDiffusionScopeRoots = async (publisherId: string, desiredPartnerIds: string[]): Promise<void> => {
    const roots = await publisherDiffusionRuleService.findRules({ publisherId, ...DIFFUSION_SCOPE_ROOT_PARAMS });
    const desired = new Set(desiredPartnerIds);
    const existing = new Set(roots.map((root) => root.value));

    for (const root of roots) {
      if (!desired.has(root.value)) {
        await publisherDiffusionRuleService.deleteRule(root.id);
      }
    }
    for (const partnerId of desiredPartnerIds) {
      if (!existing.has(partnerId)) {
        await publisherDiffusionRuleService.findOrCreateScopeRoot(publisherId, partnerId);
      }
    }
  };

  const buildWhereClause = (params: PublisherSearchParams): Prisma.PublisherWhereInput => {
    const and: Prisma.PublisherWhereInput[] = [];

    if (!params.includeDeleted) {
      and.push({ deletedAt: null });
    }

    if (params.moderator) {
      and.push({ moderator: true });
    }

    if (params.name) {
      and.push({ name: { contains: params.name, mode: "insensitive" } });
    }

    if (params.role) {
      const roleCondition: Record<string, Prisma.PublisherWhereInput> = {
        annonceur: { isAnnonceur: true },
        api: { hasApiRights: true },
        campaign: { hasCampaignRights: true },
        diffuseur: {
          OR: [{ hasApiRights: true }, { hasWidgetRights: true }, { hasCampaignRights: true }],
        },
        widget: { hasWidgetRights: true },
      };
      and.push(roleCondition[params.role]);
    }

    if (params.sendReport !== undefined) {
      and.push({ sendReport: params.sendReport });
    }

    if (params.missionType === null) {
      and.push({ missionType: null });
    } else if (params.missionType !== undefined) {
      and.push({ missionType: params.missionType as MissionType });
    }

    if (params.diffuseurOf) {
      and.push({
        diffusionRules: { some: { combinedWithId: null, field: "publisherId", operator: "is", value: params.diffuseurOf } },
      });
    }

    const ids = params.ids ?? undefined;
    const accessible = params.accessiblePublisherIds ?? undefined;
    let allowedIds: string[] | undefined;

    if (ids && accessible) {
      const set = new Set(accessible);
      allowedIds = ids.filter((value) => set.has(value));
    } else if (ids) {
      allowedIds = ids;
    } else if (accessible) {
      allowedIds = accessible;
    }

    if (allowedIds && allowedIds.length > 0) {
      and.push({ id: { in: allowedIds } });
    } else if (allowedIds && allowedIds.length === 0) {
      and.push({ id: { in: ["__none__"] } });
    }

    return and.length ? { AND: and } : {};
  };

  const countPublishers = async (params: PublisherSearchParams = {}): Promise<number> => {
    const where = buildWhereClause(params);
    return publisherRepository.count({ where });
  };

  const createPublisher = async (input: PublisherCreateInput): Promise<PublisherRecord> => {
    const normalizedPartnerIds = normalizeDiffusionPartnerIds(input.publishers);
    const rightsEnabled = Boolean(input.hasApiRights || input.hasWidgetRights || input.hasCampaignRights);
    const id = input.id ?? (await generateUniquePublisherId());

    const data: Prisma.PublisherCreateInput = {
      id: id,
      name: input.name.trim(),
      category: normalizeOptionalString(input.category) ?? null,
      url: normalizeOptionalString(input.url),
      moderator: input.moderator ?? false,
      moderatorLink: normalizeOptionalString(input.moderatorLink),
      email: normalizeOptionalString(input.email),
      documentation: normalizeOptionalString(input.documentation),
      logo: normalizeOptionalString(input.logo),
      defaultMissionLogo: normalizeOptionalString(input.defaultMissionLogo),
      lead: normalizeOptionalString(input.lead),
      feed: normalizeOptionalString(input.feed),
      feedUsername: normalizeOptionalString(input.feedUsername),
      feedPassword: normalizeOptionalString(input.feedPassword),
      apikey: normalizeOptionalString(input.apikey),
      description: normalizeOptionalString(input.description) ?? "",
      missionType: (normalizeOptionalString(input.missionType) as PublisherMissionType) ?? null,
      isAnnonceur: input.isAnnonceur ?? false,
      selfHostedScript: input.selfHostedScript ?? false,
      hasApiRights: input.hasApiRights ?? false,
      hasWidgetRights: input.hasWidgetRights ?? false,
      hasCampaignRights: input.hasCampaignRights ?? false,
      sendReport: input.sendReport ?? false,
      sendReportTo: input.sendReportTo ?? [],
    };

    const created = await publisherRepository.create({ data });

    if (rightsEnabled && normalizedPartnerIds.length) {
      await syncDiffusionScopeRoots(created.id, normalizedPartnerIds);
    }

    return toPublisherRecordWithDiffusions(created);
  };

  const publisherExistsByName = async (name: string): Promise<boolean> => {
    const count = await publisherRepository.count({ where: { name } });
    return count > 0;
  };

  const findOnePublisherByApiKey = async (apikey: string, publisherId?: string): Promise<PublisherRecordWithRelations | null> => {
    const publisher = await publisherRepository.findFirst({
      where: { apikey, ...(publisherId ? { id: publisherId } : {}) },
    });
    return publisher ? toPublisherRecordWithDiffusions(publisher) : null;
  };

  const findOnePublisherByName = async (name: string): Promise<PublisherRecord | null> => {
    const publisher = await publisherRepository.findFirst({
      where: { name },
    });
    return publisher ? toPublisherRecordWithDiffusions(publisher) : null;
  };

  const findPublishers = async (params: PublisherSearchParams = {}): Promise<PublisherRecord[]> => {
    const where = buildWhereClause(params);
    const publishers = await publisherRepository.findMany({
      where,
      orderBy: [{ name: Prisma.SortOrder.asc }],
    });
    return toPublisherRecords(publishers);
  };

  const findPublishersWithCount = async (params: PublisherSearchParams = {}): Promise<{ data: PublisherRecord[]; total: number }> => {
    const [data, total] = await Promise.all([findPublishers(params), countPublishers(params)]);
    return { data, total };
  };

  const generateUniquePublisherId = async (): Promise<string> => {
    const MONGO_OBJECT_ID_BYTES = 12;
    const MAX_ID_GENERATION_ATTEMPTS = 5;

    const generateMongoObjectId = () => randomBytes(MONGO_OBJECT_ID_BYTES).toString("hex");

    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt++) {
      const candidate = generateMongoObjectId();
      const existing = await publisherRepository.findUnique({ where: { id: candidate } });
      if (!existing) {
        return candidate;
      }
    }

    throw new Error("Failed to generate a unique publisher identifier");
  };

  const findOnePublisherById = async (id: string): Promise<PublisherRecord | null> => {
    const publisher = await publisherRepository.findUnique({ where: { id } });
    return publisher ? toPublisherRecordWithDiffusions(publisher) : null;
  };

  const findPublishersByIds = async (ids: string[]): Promise<PublisherRecord[]> => {
    if (!ids.length) {
      return [];
    }
    const publishers = await publisherRepository.findMany({
      where: { id: { in: ids } },
    });
    return toPublisherRecords(publishers);
  };

  const purgeAll = async (): Promise<void> => {
    await publisherRepository.deleteMany({});
  };

  const regenerateApiKey = async (id: string): Promise<{ apikey: string; publisher: PublisherRecord }> => {
    const apikey = randomUUID();
    const updated = await publisherRepository.update({
      where: { id },
      data: { apikey },
    });
    return { apikey, publisher: await toPublisherRecordWithDiffusions(updated) };
  };

  const softDeletePublisher = async (id: string): Promise<PublisherRecord> => {
    const updated = await publisherRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return toPublisherRecordWithDiffusions(updated);
  };

  const updatePublisher = async (id: string, patch: PublisherUpdatePatch): Promise<PublisherRecord> => {
    const existing = await publisherRepository.findUnique({ where: { id } });
    if (!existing) {
      throw new PublisherNotFoundError(id);
    }

    const normalizedPartnerIds = Array.isArray(patch.publishers) ? normalizeDiffusionPartnerIds(patch.publishers) : null;
    const effectiveRights = {
      hasApiRights: patch.hasApiRights ?? existing.hasApiRights,
      hasWidgetRights: patch.hasWidgetRights ?? existing.hasWidgetRights,
      hasCampaignRights: patch.hasCampaignRights ?? existing.hasCampaignRights,
    };
    const rightsEnabled = effectiveRights.hasApiRights || effectiveRights.hasWidgetRights || effectiveRights.hasCampaignRights;

    const data: Prisma.PublisherUpdateInput = {};

    if (patch.name !== undefined) {
      data.name = normalizeOptionalString(patch.name) ?? "";
    }
    if (patch.category !== undefined) {
      data.category = normalizeOptionalString(patch.category) ?? null;
    }
    if (patch.url !== undefined) {
      data.url = normalizeOptionalString(patch.url);
    }
    if (patch.moderator !== undefined) {
      data.moderator = patch.moderator;
    }
    if (patch.moderatorLink !== undefined) {
      data.moderatorLink = normalizeOptionalString(patch.moderatorLink);
    }
    if (patch.email !== undefined) {
      data.email = normalizeOptionalString(patch.email);
    }
    if (patch.documentation !== undefined) {
      data.documentation = normalizeOptionalString(patch.documentation);
    }
    if (patch.logo !== undefined) {
      data.logo = normalizeOptionalString(patch.logo);
    }
    if (patch.defaultMissionLogo !== undefined) {
      data.defaultMissionLogo = normalizeOptionalString(patch.defaultMissionLogo);
    }
    if (patch.description !== undefined) {
      data.description = normalizeOptionalString(patch.description) ?? "";
    }
    if (patch.lead !== undefined) {
      data.lead = normalizeOptionalString(patch.lead);
    }
    if (patch.feed !== undefined) {
      data.feed = normalizeOptionalString(patch.feed);
    }
    if (patch.feedUsername !== undefined) {
      data.feedUsername = normalizeOptionalString(patch.feedUsername);
    }
    if (patch.feedPassword !== undefined) {
      data.feedPassword = normalizeOptionalString(patch.feedPassword);
    }
    if (patch.apikey !== undefined) {
      data.apikey = normalizeOptionalString(patch.apikey);
    }
    if (patch.missionType !== undefined) {
      data.missionType = (normalizeOptionalString(patch.missionType) as MissionType) ?? null;
    }
    if (patch.isAnnonceur !== undefined) {
      data.isAnnonceur = patch.isAnnonceur;
    }
    if (patch.selfHostedScript !== undefined) {
      data.selfHostedScript = patch.selfHostedScript;
    }
    if (patch.hasApiRights !== undefined) {
      data.hasApiRights = patch.hasApiRights;
    }
    if (patch.hasWidgetRights !== undefined) {
      data.hasWidgetRights = patch.hasWidgetRights;
    }
    if (patch.hasCampaignRights !== undefined) {
      data.hasCampaignRights = patch.hasCampaignRights;
    }
    if (patch.sendReport !== undefined) {
      data.sendReport = patch.sendReport;
    }
    if (patch.sendReportTo !== undefined) {
      data.sendReportTo = { set: patch.sendReportTo ?? [] };
    }
    if (patch.deletedAt !== undefined) {
      data.deletedAt = patch.deletedAt ?? null;
    }

    const updated = await publisherRepository.update({
      where: { id },
      data,
    });

    const shouldClearDiffusions = patch.publishers === null || !rightsEnabled;

    if (shouldClearDiffusions) {
      await syncDiffusionScopeRoots(id, []);
    } else if (normalizedPartnerIds) {
      await syncDiffusionScopeRoots(id, normalizedPartnerIds);
    }

    return toPublisherRecordWithDiffusions(updated);
  };

  async function getPublisherNameMap(publisherIds: string[]): Promise<Map<string, string>> {
    if (!publisherIds.length) {
      return new Map();
    }

    const uniqueIds = Array.from(new Set(publisherIds));
    const publishers = await publisherRepository.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });

    return new Map(publishers.map((publisher) => [publisher.id, publisher.name]));
  }

  return {
    countPublishers,
    createPublisher,
    updatePublisher,
    publisherExistsByName,
    findOnePublisherByApiKey,
    findOnePublisherById,
    findOnePublisherByName,
    findPublishers,
    findPublishersByIds,
    findPublishersWithCount,
    purgeAll,
    regenerateApiKey,
    softDeletePublisher,
    getPublisherNameMap,
  };
})();
