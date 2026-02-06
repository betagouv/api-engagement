import { Campaign, CampaignTracker, Prisma, Publisher, User } from "../db/core";
import { campaignRepository } from "../repositories/campaign";
import { CampaignCreateInput, CampaignRecord, CampaignSearchParams, CampaignSearchResult, CampaignUpdatePatch } from "../types/campaign";
import { buildSearchParams, toUrl } from "../utils/url";
import statEventService from "./stat-event";

// Map MongoDB campaign type to Prisma enum

export class CampaignAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Campaign with name ${name} already exists`);
    this.name = "CampaignAlreadyExistsError";
  }
}
export class InvalidUrlError extends Error {
  constructor(url: string) {
    super(`Invalid url: ${url}`);
    this.name = "InvalidUrlError";
  }
}
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type CampaignEnriched = Campaign & {
  fromPublisher: Publisher;
  toPublisher: Publisher;
  reassignedByUser: User;
  trackers: CampaignTracker[];
};

const toCampaignRecord = (campaign: CampaignEnriched): CampaignRecord => {
  const searchParams = buildSearchParams(campaign.trackers || []);
  const url = `${campaign.url.split("?")[0]}${searchParams ? `?${searchParams}` : ""}`;

  return {
    ...campaign,
    url,
    fromPublisherName: campaign.fromPublisher.name,
    toPublisherName: campaign.toPublisher.name,
    reassignedByUsername: campaign.reassignedByUser ? `${campaign.reassignedByUser.firstname} ${campaign.reassignedByUser.lastname}` : null,
  };
};

const buildSearchWhere = (params: CampaignSearchParams, fromPublisherIds?: string[]): Prisma.CampaignWhereInput => {
  const and: Prisma.CampaignWhereInput[] = [];

  // Always filter out deleted campaigns
  if (!params.all) {
    and.push({ deletedAt: null });
  }

  if (params.active !== undefined) {
    and.push({ active: params.active });
  }

  if (params.fromPublisherId) {
    and.push({ fromPublisherId: params.fromPublisherId });
  } else if (fromPublisherIds && fromPublisherIds.length > 0) {
    // Support filtering by multiple publisher IDs
    and.push({ fromPublisherId: { in: fromPublisherIds } });
  }

  if (params.toPublisherId) {
    and.push({ toPublisherId: params.toPublisherId });
  }

  if (params.search) {
    const search = params.search.trim();
    if (search) {
      and.push({ name: { contains: search, mode: "insensitive" } });
    }
  }

  return { AND: and };
};

export const campaignService = {
  defaultInclude: Object.freeze({
    trackers: true,
    fromPublisher: { select: { id: true, name: true } },
    toPublisher: { select: { id: true, name: true } },
    reassignedByUser: { select: { id: true, firstname: true, lastname: true } },
  }) satisfies Prisma.CampaignInclude,

  async findCampaigns(params: CampaignSearchParams = {}, fromPublisherIds?: string[]): Promise<CampaignSearchResult> {
    const where = buildSearchWhere(params, fromPublisherIds);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(params.offset ?? 0, 0);
    const includeTotal = params.includeTotal ?? "filtered";

    const [total, campaigns] = await Promise.all([
      includeTotal === "none" ? Promise.resolve(0) : includeTotal === "all" ? campaignRepository.count({ where: { deletedAt: null } }) : campaignRepository.count({ where }),
      campaignRepository.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: this.defaultInclude,
      }),
    ]);

    return {
      total,
      results: campaigns.map((campaign) => toCampaignRecord(campaign as CampaignEnriched)),
    };
  },

  async findCampaignById(id: string): Promise<CampaignRecord | null> {
    if (!id) {
      return null;
    }
    const campaign = await campaignRepository.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!campaign) {
      return null;
    }
    return toCampaignRecord(campaign as CampaignEnriched);
  },

  async createCampaign(input: CampaignCreateInput): Promise<CampaignRecord> {
    try {
      const data: Prisma.CampaignCreateInput = {
        id: input.id ?? undefined,
        name: input.name.trim(),
        type: input.type,
        url: input.url,
        urlSource: input.urlSource || null,
        fromPublisher: { connect: { id: input.fromPublisherId.trim() } },
        toPublisher: { connect: { id: input.toPublisherId.trim() } },
        active: input.active ?? true,
        deletedAt: input.deletedAt ?? null,
        reassignedAt: input.reassignedAt ?? null,
        reassignedByUser: input.reassignedByUserId ? { connect: { id: input.reassignedByUserId.trim() } } : undefined,
        trackers: {
          create: (input.trackers || []).map((tracker) => ({
            key: tracker.key.trim(),
            value: tracker.value.trim(),
          })),
        },
      };

      const searchParams = new URLSearchParams();
      (input.trackers || []).forEach((tracker) => searchParams.append(tracker.key, tracker.value));
      const baseUrl = data.url.split("?")[0];
      data.url = `${baseUrl}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

      const campaign = await campaignRepository.create({
        data,
        include: this.defaultInclude,
      });
      return toCampaignRecord(campaign as CampaignEnriched);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new CampaignAlreadyExistsError(input.name);
      }
      throw error;
    }
  },

  async updateCampaign(id: string, patch: CampaignUpdatePatch): Promise<CampaignRecord> {
    const existing = (await campaignRepository.findUnique({
      where: { id },
      include: { trackers: true },
    })) as CampaignEnriched | null;

    if (!existing) {
      throw new Error("Campaign not found");
    }

    const data: Prisma.CampaignUpdateInput = {};
    if (patch.name !== undefined) {
      data.name = patch.name.trim();
    }
    if (patch.type !== undefined) {
      data.type = patch.type;
    }
    if (patch.urlSource !== undefined) {
      data.urlSource = patch.urlSource || null;
    }

    // Handle trackers logic
    data.trackers = {
      deleteMany: {},
    };
    if (patch.trackers && patch.trackers.length) {
      data.trackers.create = patch.trackers.map((t) => ({ key: t.key, value: t.value }));
    }

    if (patch.url !== undefined) {
      const url = toUrl(patch.url);
      if (!url) {
        throw new InvalidUrlError(patch.url);
      }
      data.url = url.split("?")[0];
    } else {
      data.url = existing.url.split("?")[0];
    }

    if (patch.toPublisherId !== undefined) {
      data.toPublisher = { connect: { id: patch.toPublisherId.trim() } };
    }
    if (patch.fromPublisherId !== undefined) {
      data.fromPublisher = { connect: { id: patch.fromPublisherId.trim() } };
    }
    if (patch.active !== undefined) {
      data.active = patch.active;
    }
    if (patch.deletedAt !== undefined) {
      data.deletedAt = patch.deletedAt;
    }
    if (patch.reassignedAt !== undefined) {
      data.reassignedAt = patch.reassignedAt;
    }
    if (patch.reassignedByUserId !== undefined && patch.reassignedByUserId !== null) {
      data.reassignedByUser = { connect: { id: patch.reassignedByUserId.trim() } };
    }

    const campaign = await campaignRepository.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });

    if (campaign.fromPublisherId !== existing.fromPublisherId) {
      await statEventService.reassignStatEventsForSource(campaign.id, { fromPublisherId: campaign.fromPublisherId });
    }
    if (campaign.toPublisherId !== existing.toPublisherId) {
      await statEventService.reassignStatEventsForSource(campaign.id, { toPublisherId: campaign.toPublisherId });
    }

    return toCampaignRecord(campaign as CampaignEnriched);
  },

  async duplicateCampaign(id: string): Promise<CampaignRecord> {
    const existing = await this.findCampaignById(id);
    if (!existing) {
      throw new Error("Campaign not found");
    }

    return await this.createCampaign({
      name: `${existing.name} copie`,
      type: existing.type,
      url: existing.url,
      urlSource: existing.urlSource,
      fromPublisherId: existing.fromPublisherId,
      toPublisherId: existing.toPublisherId,
      trackers: existing.trackers.map((t) => ({ key: t.key, value: t.value })),
      active: existing.active,
    });
  },

  async softDeleteCampaign(id: string): Promise<void> {
    try {
      await campaignRepository.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
        throw new Error("Campaign not found");
      }
      throw error;
    }
  },
};
