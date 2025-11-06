import { randomBytes } from "crypto";
import { v4 as uuid } from "uuid";

import { MissionType, Prisma, Publisher, PublisherDiffusion } from "../db/core";
import { publisherRepository } from "../repositories/publisher";
import { PublisherCreateInput, PublisherDiffusionInput, PublisherDiffusionRecord, PublisherRecord, PublisherSearchParams, PublisherUpdatePatch } from "../types/publisher";
import { normalizeCollection, normalizeOptionalString } from "../utils";

type PublisherWithDiffusion = Publisher & { diffuseurs?: PublisherDiffusion[] };

export class PublisherNotFoundError extends Error {
  constructor(id: string) {
    super(`Publisher ${id} not found`);
    this.name = "PublisherNotFoundError";
  }
}

export const publisherService = (() => {
  const defaultInclude = Object.freeze({ diffuseurs: true }) satisfies Prisma.PublisherInclude;

  const toDiffusionRecord = (diffusion: PublisherDiffusion): PublisherDiffusionRecord => ({
    id: diffusion.id,
    diffuseurPublisherId: diffusion.diffuseurPublisherId,
    annonceurPublisherId: diffusion.annonceurPublisherId,
    moderator: diffusion.moderator,
    missionType: diffusion.missionType ?? null,
    createdAt: diffusion.createdAt,
    updatedAt: diffusion.updatedAt,
  });

  const toPublisherRecord = (publisher: PublisherWithDiffusion): PublisherRecord => ({
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
    missionType: publisher.missionType ?? null,
    isAnnonceur: publisher.isAnnonceur,
    hasApiRights: publisher.hasApiRights,
    hasWidgetRights: publisher.hasWidgetRights,
    hasCampaignRights: publisher.hasCampaignRights,
    sendReport: publisher.sendReport,
    sendReportTo: publisher.sendReportTo ?? [],
    deletedAt: publisher.deletedAt ?? null,
    createdAt: publisher.createdAt,
    updatedAt: publisher.updatedAt,
    publishers: (publisher.diffuseurs ?? []).map(toDiffusionRecord),
  });

  const normalizeDiffusions = (publishers?: PublisherDiffusionInput[] | null) =>
    normalizeCollection(
      publishers,
      (diffusion) => {
        const publisherId = diffusion.diffuseurPublisherId ?? diffusion.publisherId;
        const diffuseurPublisherId = publisherId?.trim();
        if (!diffuseurPublisherId) {
          return null;
        }

        const missionType = normalizeOptionalString(diffusion.missionType);

        return {
          diffuseurPublisherId,
          moderator: diffusion.moderator ?? false,
          missionType: missionType ?? null,
        };
      },
      {
        key: (diffusion) => diffusion.diffuseurPublisherId,
      }
    );

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
      and.push({ diffuseurs: { some: { diffuseurPublisherId: params.diffuseurOf } } });
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
    const normalizedPublishers = normalizeDiffusions(input.publishers);
    const rightsEnabled = Boolean(input.hasApiRights || input.hasWidgetRights || input.hasCampaignRights);
    const generatedId = await generateUniquePublisherId();

    const data: Prisma.PublisherCreateInput = {
      id: generatedId,
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
      missionType: (normalizeOptionalString(input.missionType) as MissionType) ?? null,
      isAnnonceur: input.isAnnonceur ?? false,
      hasApiRights: input.hasApiRights ?? false,
      hasWidgetRights: input.hasWidgetRights ?? false,
      hasCampaignRights: input.hasCampaignRights ?? false,
      sendReport: input.sendReport ?? false,
      sendReportTo: input.sendReportTo ?? [],
    };

    if (rightsEnabled && normalizedPublishers.length) {
      data.diffuseurs = {
        create: normalizedPublishers.map((diffusion) => ({
          diffuseurPublisherId: diffusion.diffuseurPublisherId,
          moderator: diffusion.moderator,
          missionType: (normalizeOptionalString(diffusion.missionType) as MissionType) ?? null,
        })),
      };
    }

    const created = await publisherRepository.create({
      data,
      include: defaultInclude,
    });

    return toPublisherRecord(created as PublisherWithDiffusion);
  };

  const existsByName = async (name: string): Promise<boolean> => {
    const count = await publisherRepository.count({ where: { name } });
    return count > 0;
  };

  const findByApiKey = async (apikey: string, publisherId?: string): Promise<PublisherRecord | null> => {
    const publisher = await publisherRepository.findFirst({
      where: { apikey, ...(publisherId ? { id: publisherId } : {}) },
      include: defaultInclude,
    });
    return publisher ? toPublisherRecord(publisher as PublisherWithDiffusion) : null;
  };

  const findPublisherByName = async (name: string): Promise<PublisherRecord | null> => {
    const publisher = await publisherRepository.findFirst({
      where: { name },
      include: defaultInclude,
    });
    return publisher ? toPublisherRecord(publisher as PublisherWithDiffusion) : null;
  };

  const findPublishers = async (params: PublisherSearchParams = {}): Promise<PublisherRecord[]> => {
    const where = buildWhereClause(params);
    const publishers = await publisherRepository.findMany({
      where,
      orderBy: [{ name: Prisma.SortOrder.asc }],
      include: defaultInclude,
    });
    return publishers.map((publisher) => toPublisherRecord(publisher as PublisherWithDiffusion));
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

  const getPublisherById = async (id: string): Promise<PublisherRecord | null> => {
    const publisher = await publisherRepository.findUnique({ where: { id }, include: defaultInclude });
    return publisher ? toPublisherRecord(publisher as PublisherWithDiffusion) : null;
  };

  const getPublishersByIds = async (ids: string[]): Promise<PublisherRecord[]> => {
    if (!ids.length) {
      return [];
    }
    const publishers = await publisherRepository.findMany({
      where: { id: { in: ids } },
      include: defaultInclude,
    });
    return publishers.map((publisher) => toPublisherRecord(publisher as PublisherWithDiffusion));
  };

  const purgeAll = async (): Promise<void> => {
    await publisherRepository.deleteMany({});
  };

  const regenerateApiKey = async (id: string): Promise<{ apikey: string; publisher: PublisherRecord }> => {
    const apikey = uuid();
    const updated = await publisherRepository.update({
      where: { id },
      data: { apikey },
      include: defaultInclude,
    });
    return { apikey, publisher: toPublisherRecord(updated as PublisherWithDiffusion) };
  };

  const softDeletePublisher = async (id: string): Promise<PublisherRecord> => {
    const updated = await publisherRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: defaultInclude,
    });
    return toPublisherRecord(updated as PublisherWithDiffusion);
  };

  const updatePublisher = async (id: string, patch: PublisherUpdatePatch): Promise<PublisherRecord> => {
    const existing: PublisherWithDiffusion | null = await publisherRepository.findUnique({ where: { id }, include: defaultInclude });
    if (!existing) {
      throw new PublisherNotFoundError(id);
    }

    const normalizedPublishers = Array.isArray(patch.publishers) ? normalizeDiffusions(patch.publishers) : null;
    const effectiveRights = {
      hasApiRights: patch.hasApiRights ?? existing.hasApiRights,
      hasWidgetRights: patch.hasWidgetRights ?? existing.hasWidgetRights,
      hasCampaignRights: patch.hasCampaignRights ?? existing.hasCampaignRights,
    };
    const rightsEnabled = effectiveRights.hasApiRights || effectiveRights.hasWidgetRights || effectiveRights.hasCampaignRights;

    const data: Prisma.PublisherUpdateInput = {};

    if (patch.name !== undefined) {
      data.name = patch.name.trim();
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

    if (patch.publishers === null || (!rightsEnabled && (existing.diffuseurs?.length ?? 0) > 0)) {
      data.diffuseurs = { deleteMany: {} };
    } else if (normalizedPublishers) {
      data.diffuseurs = {
        deleteMany: {},
        create: normalizedPublishers.map((diffusion) => ({
          diffuseurPublisherId: diffusion.diffuseurPublisherId,
          moderator: diffusion.moderator,
          missionType: (normalizeOptionalString(diffusion.missionType) as MissionType) ?? null,
        })),
      };
    }

    const updated = await publisherRepository.update({
      where: { id },
      data,
      include: defaultInclude,
    });

    return toPublisherRecord(updated as PublisherWithDiffusion);
  };

  return {
    countPublishers,
    createPublisher,
    existsByName,
    findByApiKey,
    findPublisherByName,
    findPublishers,
    findPublishersWithCount,
    getPublisherById,
    getPublishersByIds,
    purgeAll,
    regenerateApiKey,
    softDeletePublisher,
    updatePublisher,
  };
})();
