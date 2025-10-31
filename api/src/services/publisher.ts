import { v4 as uuid } from "uuid";

import { Prisma, Publisher, PublisherDiffuseur } from "../db/core";
import { publisherRepository } from "../repositories/publisher";
import { PublisherCreateInput, PublisherDiffuseurInput, PublisherDiffuseurRecord, PublisherRecord, PublisherSearchParams, PublisherUpdatePatch } from "../types/publisher";

type PublisherWithDiffuseurs = Publisher & { diffuseurs: PublisherDiffuseur[] };

export class PublisherNotFoundError extends Error {
  constructor(id: string) {
    super(`Publisher ${id} not found`);
    this.name = "PublisherNotFoundError";
  }
}

const toDiffuseurRecord = (diffuseur: PublisherDiffuseur): PublisherDiffuseurRecord => ({
  id: diffuseur.id,
  publisherId: diffuseur.linkedPublisherId,
  moderator: diffuseur.moderator,
  missionType: diffuseur.missionType ?? null,
  createdAt: diffuseur.createdAt,
  updatedAt: diffuseur.updatedAt,
});

const toPublisherRecord = (publisher: PublisherWithDiffuseurs): PublisherRecord => ({
  id: publisher.id,
  _id: publisher.id,
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
  publishers: (publisher.diffuseurs ?? []).map(toDiffuseurRecord),
});

const normalizeString = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const normalizePublishersInput = (publishers?: PublisherDiffuseurInput[] | null) => {
  if (!publishers || publishers.length === 0) {
    return [];
  }

  const uniqueById = new Map<string, PublisherDiffuseurInput>();
  for (const diffuseur of publishers) {
    if (!diffuseur.publisherId) {
      continue;
    }
    const normalized: PublisherDiffuseurInput = {
      publisherId: diffuseur.publisherId,
      publisherName: diffuseur.publisherName?.trim() ?? diffuseur.publisherId,
      moderator: diffuseur.moderator ?? false,
      missionType: diffuseur.missionType ?? null,
    };
    uniqueById.set(normalized.publisherId, normalized);
  }
  return Array.from(uniqueById.values());
};

const buildFilters = (params: PublisherSearchParams): Prisma.PublisherWhereInput => {
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
    switch (params.role) {
      case "annonceur":
        and.push({ isAnnonceur: true });
        break;
      case "diffuseur":
        and.push({
          OR: [{ hasApiRights: true }, { hasWidgetRights: true }, { hasCampaignRights: true }],
        });
        break;
      case "api":
        and.push({ hasApiRights: true });
        break;
      case "widget":
        and.push({ hasWidgetRights: true });
        break;
      case "campaign":
        and.push({ hasCampaignRights: true });
        break;
    }
  }

  if (params.sendReport !== undefined) {
    and.push({ sendReport: params.sendReport });
  }

  if (params.missionType === null) {
    and.push({ missionType: null });
  } else if (params.missionType !== undefined) {
    and.push({ missionType: params.missionType });
  }

  if (params.diffuseurOf) {
    and.push({ diffuseurs: { some: { linkedPublisherId: params.diffuseurOf } } });
  }

  const allowedIds = (() => {
    const ids = params.ids ?? undefined;
    const accessible = params.accessiblePublisherIds ?? undefined;
    if (ids && accessible) {
      const set = new Set(accessible);
      const intersection = ids.filter((value) => set.has(value));
      return intersection;
    }
    if (ids) {
      return ids;
    }
    if (accessible) {
      return accessible;
    }
    return undefined;
  })();

  if (allowedIds && allowedIds.length > 0) {
    and.push({ id: { in: allowedIds } });
  } else if (allowedIds && allowedIds.length === 0) {
    // Empty intersection, force non-matching condition
    and.push({ id: { in: ["__none__"] } });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
};

const defaultInclude = Object.freeze({ diffuseurs: true }) satisfies Prisma.PublisherInclude;

export const publisherService = {
  async findPublishers(params: PublisherSearchParams = {}): Promise<PublisherRecord[]> {
    const where = buildFilters(params);
    const publishers = await publisherRepository.findMany({
      where,
      orderBy: [{ name: Prisma.SortOrder.asc }],
      include: defaultInclude,
    });
    return publishers.map(toPublisherRecord);
  },

  async countPublishers(params: PublisherSearchParams = {}): Promise<number> {
    const where = buildFilters(params);
    return publisherRepository.count({ where });
  },

  async findPublishersWithCount(params: PublisherSearchParams = {}): Promise<{ data: PublisherRecord[]; total: number }> {
    const [data, total] = await Promise.all([this.findPublishers(params), this.countPublishers(params)]);
    return { data, total };
  },

  async getPublisherById(id: string): Promise<PublisherRecord | null> {
    const publisher = await publisherRepository.findUnique({ where: { id }, include: defaultInclude });
    return publisher ? toPublisherRecord(publisher) : null;
  },

  async getPublishersByIds(ids: string[]): Promise<PublisherRecord[]> {
    if (!ids.length) {
      return [];
    }
    const publishers = await publisherRepository.findMany({
      where: { id: { in: ids } },
      include: defaultInclude,
    });
    return publishers.map(toPublisherRecord);
  },

  async listPublishersSummary(): Promise<Array<Pick<PublisherRecord, "id" | "_id" | "name">>> {
    const publishers = await publisherRepository.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: Prisma.SortOrder.asc }],
      select: { id: true, name: true },
    });
    return publishers.map((publisher) => ({
      id: publisher.id,
      _id: publisher.id,
      name: publisher.name,
    }));
  },

  async findByApiKey(apikey: string, publisherId?: string): Promise<PublisherRecord | null> {
    const publisher = await publisherRepository.findFirst({
      where: { apikey, ...(publisherId ? { id: publisherId } : {}) },
      include: defaultInclude,
    });
    return publisher ? toPublisherRecord(publisher) : null;
  },

  async findPublisherByName(name: string): Promise<PublisherRecord | null> {
    const publisher = await publisherRepository.findFirst({
      where: { name },
      include: defaultInclude,
    });
    return publisher ? toPublisherRecord(publisher) : null;
  },

  async existsByName(name: string): Promise<boolean> {
    const count = await publisherRepository.count({ where: { name } });
    return count > 0;
  },

  async createPublisher(input: PublisherCreateInput): Promise<PublisherRecord> {
    const normalizedPublishers = normalizePublishersInput(input.publishers);
    const rightsEnabled = Boolean(input.hasApiRights || input.hasWidgetRights || input.hasCampaignRights);

    const data: Prisma.PublisherCreateInput = {
      name: input.name.trim(),
      category: input.category ?? null,
      url: normalizeString(input.url),
      moderator: input.moderator ?? false,
      moderatorLink: normalizeString(input.moderatorLink),
      email: normalizeString(input.email),
      documentation: normalizeString(input.documentation),
      logo: normalizeString(input.logo),
      defaultMissionLogo: normalizeString(input.defaultMissionLogo),
      lead: normalizeString(input.lead),
      feed: normalizeString(input.feed),
      feedUsername: normalizeString(input.feedUsername),
      feedPassword: normalizeString(input.feedPassword),
      apikey: normalizeString(input.apikey),
      description: input.description?.trim() ?? "",
      missionType: input.missionType ?? null,
      isAnnonceur: input.isAnnonceur ?? false,
      hasApiRights: input.hasApiRights ?? false,
      hasWidgetRights: input.hasWidgetRights ?? false,
      hasCampaignRights: input.hasCampaignRights ?? false,
      sendReport: input.sendReport ?? false,
      sendReportTo: input.sendReportTo ?? [],
    };

    if (rightsEnabled && normalizedPublishers.length) {
      data.diffuseurs = {
        create: normalizedPublishers.map((diffuseur) => ({
          linkedPublisherId: diffuseur.publisherId,
          linkedPublisherName: diffuseur.publisherName,
          moderator: diffuseur.moderator ?? false,
          missionType: diffuseur.missionType ?? null,
        })),
      };
    }

    const created = await publisherRepository.create({
      data,
      include: defaultInclude,
    });

    return toPublisherRecord(created);
  },

  async updatePublisher(id: string, patch: PublisherUpdatePatch): Promise<PublisherRecord> {
    const normalizedPatch = {
      category: patch.category ?? null,
      url: normalizeString(patch.url),
      moderator: patch.moderator,
      moderatorLink: normalizeString(patch.moderatorLink),
      email: normalizeString(patch.email),
      documentation: normalizeString(patch.documentation),
      logo: normalizeString(patch.logo),
      defaultMissionLogo: normalizeString(patch.defaultMissionLogo),
      description: patch.description?.trim(),
      lead: normalizeString(patch.lead),
      feed: normalizeString(patch.feed),
      feedUsername: normalizeString(patch.feedUsername),
      feedPassword: normalizeString(patch.feedPassword),
      apikey: normalizeString(patch.apikey),
      missionType: patch.missionType ?? null,
    };

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
      data.category = normalizedPatch.category;
    }
    if (patch.url !== undefined) {
      data.url = normalizedPatch.url;
    }
    if (patch.moderator !== undefined) {
      data.moderator = patch.moderator;
    }
    if (patch.moderatorLink !== undefined) {
      data.moderatorLink = normalizedPatch.moderatorLink;
    }
    if (patch.email !== undefined) {
      data.email = normalizedPatch.email;
    }
    if (patch.documentation !== undefined) {
      data.documentation = normalizedPatch.documentation;
    }
    if (patch.logo !== undefined) {
      data.logo = normalizedPatch.logo;
    }
    if (patch.defaultMissionLogo !== undefined) {
      data.defaultMissionLogo = normalizedPatch.defaultMissionLogo;
    }
    if (patch.description !== undefined) {
      data.description = normalizedPatch.description ?? "";
    }
    if (patch.lead !== undefined) {
      data.lead = normalizedPatch.lead;
    }
    if (patch.feed !== undefined) {
      data.feed = normalizedPatch.feed;
    }
    if (patch.feedUsername !== undefined) {
      data.feedUsername = normalizedPatch.feedUsername;
    }
    if (patch.feedPassword !== undefined) {
      data.feedPassword = normalizedPatch.feedPassword;
    }
    if (patch.apikey !== undefined) {
      data.apikey = normalizedPatch.apikey;
    }
    if (patch.missionType !== undefined) {
      data.missionType = normalizedPatch.missionType;
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

    const shouldResetPublishers = (!rightsEnabled && existing.diffuseurs.length > 0) || patch.publishers === null || (Array.isArray(patch.publishers) && !rightsEnabled);

    if (shouldResetPublishers) {
      data.diffuseurs = { deleteMany: {} };
    } else if (Array.isArray(patch.publishers)) {
      const normalizedPublishers = normalizePublishersInput(patch.publishers);
      data.diffuseurs = {
        deleteMany: {},
        create: normalizedPublishers.map((diffuseur) => ({
          linkedPublisherId: diffuseur.publisherId,
          linkedPublisherName: diffuseur.publisherName,
          moderator: diffuseur.moderator ?? false,
          missionType: diffuseur.missionType ?? null,
        })),
      };
    }

    const updated = await publisherRepository.update({
      where: { id },
      data,
      include: defaultInclude,
    });

    return toPublisherRecord(updated);
  },

  async softDeletePublisher(id: string): Promise<PublisherRecord> {
    const updated = await publisherRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: defaultInclude,
    });
    return toPublisherRecord(updated);
  },

  async regenerateApiKey(id: string): Promise<{ apikey: string; publisher: PublisherRecord }> {
    const apikey = uuid();
    const updated = await publisherRepository.update({
      where: { id },
      data: { apikey },
      include: defaultInclude,
    });
    return { apikey, publisher: toPublisherRecord(updated) };
  },

  async purgeAll(): Promise<void> {
    await publisherRepository.deleteMany({});
  },
};
