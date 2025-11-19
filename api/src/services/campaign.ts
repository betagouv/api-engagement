import { Prisma } from "../db/core";
import { campaignRepository } from "../repositories/campaign";
import { CampaignCreateInput, CampaignRecord, CampaignSearchParams, CampaignSearchResult, CampaignTrackerInput, CampaignType, CampaignUpdatePatch } from "../types/campaign";
import { normalizeOptionalString } from "../utils/normalize";

// Map MongoDB campaign type to Prisma enum
const mapCampaignType = (type: string): CampaignType => {
  switch (type) {
    case "banniere/publicité":
      return "AD_BANNER";
    case "mailing":
      return "MAILING";
    case "tuile/bouton":
      return "TILE_BUTTON";
    case "autre":
      return "OTHER";
    default:
      return "OTHER";
  }
};

// Map Prisma enum to MongoDB campaign type format
const mapCampaignTypeToString = (type: CampaignType): string => {
  switch (type) {
    case CampaignType.banniere_publicite:
      return "banniere/publicité";
    case CampaignType.mailing:
      return "mailing";
    case CampaignType.tuile_bouton:
      return "tuile/bouton";
    case CampaignType.autre:
      return "autre";
    default:
      return "autre";
  }
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type CampaignWithTrackers = CampaignRecord & {
  trackers: { key: string; value: string }[];
};

const toCampaignRecord = (campaign: CampaignWithTrackers): CampaignRecord => {
  return {
    ...campaign,
    type: mapCampaignTypeToString(campaign.type) as any, // Convert enum back to string format for API compatibility
    trackers: campaign.trackers,
  };
};

const buildSearchWhere = (params: CampaignSearchParams, fromPublisherIds?: string[]): Prisma.CampaignWhereInput => {
  const and: Prisma.CampaignWhereInput[] = [];

  // Always filter out deleted campaigns
  and.push({ deletedAt: null });

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

  if (!and.length) {
    return { deletedAt: null };
  }
  return { AND: and };
};

const mapCreateInput = (input: CampaignCreateInput): Prisma.CampaignCreateInput => {
  const name = normalizeOptionalString(input.name);
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const url = normalizeOptionalString(input.url);
  if (!url) {
    throw new Error("Campaign URL is required");
  }

  const type = typeof input.type === "string" ? mapCampaignType(input.type) : input.type;

  return {
    name,
    type,
    url,
    fromPublisherId: input.fromPublisherId.trim(),
    toPublisherId: input.toPublisherId.trim(),
    active: input.active ?? true,
    trackers: {
      create: (input.trackers || []).map((tracker) => ({
        key: tracker.key.trim(),
        value: tracker.value.trim(),
      })),
    },
  };
};

const mapUpdateInput = (patch: CampaignUpdatePatch, existingTrackers?: CampaignTrackerInput[]): Prisma.CampaignUpdateInput => {
  const data: Prisma.CampaignUpdateInput = {};

  if (patch.name !== undefined) {
    const name = normalizeOptionalString(patch.name);
    if (name) {
      data.name = name;
    }
  }

  if (patch.type !== undefined) {
    const type = typeof patch.type === "string" ? mapCampaignType(patch.type) : patch.type;
    data.type = type;
  }

  if (patch.url !== undefined) {
    const url = normalizeOptionalString(patch.url);
    if (url) {
      data.url = url;
    }
  }

  if (patch.toPublisherId !== undefined) {
    data.toPublisherId = patch.toPublisherId.trim();
  }

  if (patch.active !== undefined) {
    data.active = patch.active;
  }

  // Handle trackers update - replace all trackers
  if (patch.trackers !== undefined) {
    data.trackers = {
      deleteMany: {},
      create: patch.trackers.map((tracker) => ({
        key: tracker.key.trim(),
        value: tracker.value.trim(),
      })),
    };
  }

  return data;
};

export const campaignService = (() => {
  const findCampaigns = async (params: CampaignSearchParams = {}, fromPublisherIds?: string[]): Promise<CampaignSearchResult> => {
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
        include: { trackers: true },
      }),
    ]);

    return {
      total,
      results: campaigns.map(toCampaignRecord),
    };
  };

  const findCampaignById = async (id: string): Promise<CampaignRecord | null> => {
    if (!id) {
      return null;
    }
    const campaign = await campaignRepository.findUnique({
      where: { id },
      include: { trackers: true },
    });
    if (!campaign || campaign.deletedAt) {
      return null;
    }
    return toCampaignRecord(campaign);
  };

  const createCampaign = async (input: CampaignCreateInput): Promise<CampaignRecord> => {
    try {
      const campaign = await campaignRepository.create({
        data: mapCreateInput(input),
        include: { trackers: true },
      });
      return toCampaignRecord(campaign);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
        throw new Error("Campaign with this name already exists for this publisher");
      }
      throw error;
    }
  };

  const updateCampaign = async (id: string, patch: CampaignUpdatePatch): Promise<CampaignRecord> => {
    try {
      const existing = await campaignRepository.findUnique({
        where: { id },
        include: { trackers: true },
      });

      if (!existing || existing.deletedAt) {
        throw new Error("Campaign not found");
      }

      const campaign = await campaignRepository.update({
        where: { id },
        data: mapUpdateInput(
          patch,
          existing.trackers.map((t) => ({ key: t.key, value: t.value }))
        ),
        include: { trackers: true },
      });

      return toCampaignRecord(campaign);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
        throw new Error("Campaign not found");
      }
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
        throw new Error("Campaign with this name already exists for this publisher");
      }
      throw error;
    }
  };

  const duplicateCampaign = async (id: string): Promise<CampaignRecord> => {
    const existing = await findCampaignById(id);
    if (!existing) {
      throw new Error("Campaign not found");
    }

    const existingType = typeof existing.type === "string" ? mapCampaignType(existing.type) : existing.type;
    return await createCampaign({
      name: `${existing.name} copie`,
      type: existingType,
      url: existing.url,
      fromPublisherId: existing.fromPublisherId,
      toPublisherId: existing.toPublisherId,
      trackers: existing.trackers.map((t) => ({ key: t.key, value: t.value })),
      active: existing.active,
    });
  };

  const reassignCampaign = async (id: string, fromPublisherId: string, reassignedByUsername: string, reassignedByUserId: string): Promise<CampaignRecord> => {
    const existing = await findCampaignById(id);
    if (!existing) {
      throw new Error("Campaign not found");
    }

    if (existing.fromPublisherId === fromPublisherId) {
      throw new Error("Campaign is already assigned to this publisher");
    }

    const campaign = await campaignRepository.update({
      where: { id },
      data: {
        fromPublisherId: fromPublisherId.trim(),
        reassignedAt: new Date(),
        reassignedByUsername: reassignedByUsername.trim(),
        reassignedByUserId: reassignedByUserId.trim(),
      },
      include: { trackers: true },
    });

    return toCampaignRecord(campaign);
  };

  const softDeleteCampaign = async (id: string): Promise<void> => {
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
  };

  return {
    findCampaigns,
    findCampaignById,
    createCampaign,
    updateCampaign,
    duplicateCampaign,
    reassignCampaign,
    softDeleteCampaign,
  };
})();
