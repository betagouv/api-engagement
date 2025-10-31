import { vi } from "vitest";

import type { PublisherRecord, PublisherDiffuseurRecord, PublisherCreateInput, PublisherUpdatePatch, PublisherSearchParams } from "../../src/types/publisher";

let autoIncrement = 0;
const publishers = new Map<string, PublisherRecord>();

const now = () => new Date();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeDiffuseurs = (publisherId: string, inputs?: PublisherCreateInput["publishers"]): PublisherDiffuseurRecord[] => {
  if (!inputs || !inputs.length) {
    return [];
  }
  const createdAt = now();
  return inputs.map((input, index) => ({
    id: `${publisherId}:diffuseur:${index}`,
    publisherId: input.publisherId,
    publisherName: input.publisherName,
    moderator: input.moderator ?? false,
    missionType: input.missionType ?? null,
    createdAt,
    updatedAt: createdAt,
  }));
};

const buildRecord = (input: PublisherCreateInput): PublisherRecord => {
  const id = `publisher-${++autoIncrement}`;
  const createdAt = now();
  const record: PublisherRecord = {
    id,
    _id: id,
    name: input.name ?? `Publisher ${autoIncrement}`,
    category: input.category ?? null,
    url: input.url ?? null,
    moderator: input.moderator ?? false,
    moderatorLink: input.moderatorLink ?? null,
    email: input.email ?? null,
    documentation: input.documentation ?? null,
    logo: input.logo ?? null,
    defaultMissionLogo: input.defaultMissionLogo ?? null,
    lead: input.lead ?? null,
    feed: input.feed ?? null,
    feedUsername: input.feedUsername ?? null,
    feedPassword: input.feedPassword ?? null,
    apikey: input.apikey ?? null,
    description: input.description ?? "",
    missionType: input.missionType ?? null,
    isAnnonceur: input.isAnnonceur ?? false,
    hasApiRights: input.hasApiRights ?? false,
    hasWidgetRights: input.hasWidgetRights ?? false,
    hasCampaignRights: input.hasCampaignRights ?? false,
    sendReport: input.sendReport ?? false,
    sendReportTo: input.sendReportTo ?? [],
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    publishers: normalizeDiffuseurs(id, input.publishers),
  };
  return record;
};

const applyFilters = (records: PublisherRecord[], params: PublisherSearchParams = {}): PublisherRecord[] => {
  let result = records;

  if (!params.includeDeleted) {
    result = result.filter((publisher) => !publisher.deletedAt);
  }
  if (params.ids && params.ids.length) {
    const set = new Set(params.ids);
    result = result.filter((publisher) => set.has(publisher.id));
  }
  if (params.accessiblePublisherIds && params.accessiblePublisherIds.length) {
    const set = new Set(params.accessiblePublisherIds);
    result = result.filter((publisher) => set.has(publisher.id));
  }
  if (params.diffuseurOf) {
    result = result.filter((publisher) => publisher.publishers.some((diffuseur) => diffuseur.publisherId === params.diffuseurOf));
  }
  if (params.moderator !== undefined) {
    result = result.filter((publisher) => publisher.moderator === params.moderator);
  }
  if (params.name) {
    const needle = params.name.toLowerCase();
    result = result.filter((publisher) => publisher.name.toLowerCase().includes(needle));
  }
  if (params.sendReport !== undefined) {
    result = result.filter((publisher) => publisher.sendReport === params.sendReport);
  }
  if (params.missionType !== undefined) {
    result = result.filter((publisher) => publisher.missionType === params.missionType);
  }
  if (params.role) {
    result = result.filter((publisher) => {
      switch (params.role) {
        case "annonceur":
          return publisher.isAnnonceur;
        case "diffuseur":
          return publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights;
        case "api":
          return publisher.hasApiRights;
        case "widget":
          return publisher.hasWidgetRights;
        case "campaign":
          return publisher.hasCampaignRights;
        default:
          return true;
      }
    });
  }

  return result;
};

const updateRecord = (record: PublisherRecord, patch: PublisherUpdatePatch): PublisherRecord => {
  const updated: PublisherRecord = {
    ...record,
    name: patch.name !== undefined ? patch.name : record.name,
    category: patch.category !== undefined ? patch.category : record.category,
    url: patch.url !== undefined ? patch.url ?? null : record.url,
    moderator: patch.moderator ?? record.moderator,
    moderatorLink: patch.moderatorLink !== undefined ? patch.moderatorLink ?? null : record.moderatorLink,
    email: patch.email !== undefined ? patch.email ?? null : record.email,
    documentation: patch.documentation !== undefined ? patch.documentation ?? null : record.documentation,
    logo: patch.logo !== undefined ? patch.logo ?? null : record.logo,
    defaultMissionLogo: patch.defaultMissionLogo !== undefined ? patch.defaultMissionLogo ?? null : record.defaultMissionLogo,
    description: patch.description !== undefined ? patch.description ?? "" : record.description,
    lead: patch.lead !== undefined ? patch.lead ?? null : record.lead,
    feed: patch.feed !== undefined ? patch.feed ?? null : record.feed,
    feedUsername: patch.feedUsername !== undefined ? patch.feedUsername ?? null : record.feedUsername,
    feedPassword: patch.feedPassword !== undefined ? patch.feedPassword ?? null : record.feedPassword,
    apikey: patch.apikey !== undefined ? patch.apikey ?? null : record.apikey,
    missionType: patch.missionType !== undefined ? patch.missionType ?? null : record.missionType,
    isAnnonceur: patch.isAnnonceur ?? record.isAnnonceur,
    hasApiRights: patch.hasApiRights ?? record.hasApiRights,
    hasWidgetRights: patch.hasWidgetRights ?? record.hasWidgetRights,
    hasCampaignRights: patch.hasCampaignRights ?? record.hasCampaignRights,
    sendReport: patch.sendReport ?? record.sendReport,
    sendReportTo: patch.sendReportTo !== undefined ? [...(patch.sendReportTo ?? [])] : record.sendReportTo,
    deletedAt: patch.deletedAt !== undefined ? patch.deletedAt ?? null : record.deletedAt,
    updatedAt: now(),
    publishers:
      patch.publishers === undefined
        ? record.publishers
        : normalizeDiffuseurs(record.id, patch.publishers || []),
  };
  return updated;
};

export class PublisherNotFoundError extends Error {
  constructor(id: string) {
    super(`Publisher ${id} not found`);
    this.name = "PublisherNotFoundError";
  }
}

export const publisherService = {
  async findPublishers(params: PublisherSearchParams = {}): Promise<PublisherRecord[]> {
    return applyFilters(Array.from(publishers.values()), params).map(clone);
  },
  async countPublishers(params: PublisherSearchParams = {}): Promise<number> {
    return applyFilters(Array.from(publishers.values()), params).length;
  },
  async findPublishersWithCount(params: PublisherSearchParams = {}): Promise<{ data: PublisherRecord[]; total: number }> {
    const data = await this.findPublishers(params);
    const total = await this.countPublishers(params);
    return { data, total };
  },
  async getPublisherById(id: string): Promise<PublisherRecord | null> {
    const record = publishers.get(id);
    return record ? clone(record) : null;
  },
  async getPublishersByIds(ids: string[]): Promise<PublisherRecord[]> {
    return ids
      .map((id) => publishers.get(id))
      .filter((record): record is PublisherRecord => Boolean(record))
      .map(clone);
  },
  async listPublishersSummary(): Promise<Array<{ id: string; _id: string; name: string }>> {
    return Array.from(publishers.values())
      .filter((record) => !record.deletedAt)
      .map((record) => ({ id: record.id, _id: record.id, name: record.name }));
  },
  async findByApiKey(apikey: string, publisherId?: string): Promise<PublisherRecord | null> {
    const record = Array.from(publishers.values()).find((publisher) => publisher.apikey === apikey && (!publisherId || publisher.id === publisherId));
    return record ? clone(record) : null;
  },
  async findPublisherByName(name: string): Promise<PublisherRecord | null> {
    const record = Array.from(publishers.values()).find((publisher) => publisher.name === name);
    return record ? clone(record) : null;
  },
  async existsByName(name: string): Promise<boolean> {
    return Array.from(publishers.values()).some((publisher) => publisher.name === name);
  },
  async createPublisher(input: PublisherCreateInput): Promise<PublisherRecord> {
    const record = buildRecord(input);
    publishers.set(record.id, record);
    return clone(record);
  },
  async updatePublisher(id: string, patch: PublisherUpdatePatch): Promise<PublisherRecord> {
    const current = publishers.get(id);
    if (!current) {
      throw new PublisherNotFoundError(id);
    }
    const updated = updateRecord(current, patch);
    publishers.set(id, updated);
    return clone(updated);
  },
  async softDeletePublisher(id: string): Promise<PublisherRecord> {
    const current = publishers.get(id);
    if (!current) {
      throw new PublisherNotFoundError(id);
    }
    current.deletedAt = now();
    current.updatedAt = now();
    publishers.set(id, current);
    return clone(current);
  },
  async regenerateApiKey(id: string): Promise<{ apikey: string; publisher: PublisherRecord }> {
    const current = publishers.get(id);
    if (!current) {
      throw new PublisherNotFoundError(id);
    }
    const apikey = `apikey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    current.apikey = apikey;
    current.updatedAt = now();
    publishers.set(id, current);
    return { apikey, publisher: clone(current) };
  },
  async clearApiKey(id: string): Promise<PublisherRecord> {
    const current = publishers.get(id);
    if (!current) {
      throw new PublisherNotFoundError(id);
    }
    current.apikey = null;
    current.updatedAt = now();
    publishers.set(id, current);
    return clone(current);
  },
  async updateLogo(id: string, logo: string | null): Promise<PublisherRecord> {
    const current = publishers.get(id);
    if (!current) {
      throw new PublisherNotFoundError(id);
    }
    current.logo = logo;
    current.updatedAt = now();
    publishers.set(id, current);
    return clone(current);
  },
  async purgeAll(): Promise<void> {
    publishers.clear();
  },
};

vi.mock("../../src/services/publisher", () => ({
  publisherService,
  PublisherNotFoundError,
}));

export const resetPublisherStore = () => {
  publishers.clear();
  autoIncrement = 0;
};

export const setPublishers = (records: PublisherRecord[]) => {
  publishers.clear();
  records.forEach((record) => {
    publishers.set(record.id, { ...record, _id: record._id ?? record.id });
  });
};

export const getPublisherStoreSnapshot = () => Array.from(publishers.values()).map(clone);
