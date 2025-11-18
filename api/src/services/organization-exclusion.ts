import { Prisma } from "../db/core";
import { organizationExclusionRepository } from "../repositories/organization-exclusion";
import {
  OrganizationExclusionCreateInput,
  OrganizationExclusionCreateManyInput,
  OrganizationExclusionRecord,
} from "../types/organization-exclusion";
import { normalizeOptionalString } from "../utils/normalize";

const mapCreateInput = (input: OrganizationExclusionCreateInput): Prisma.OrganizationExclusionCreateInput => {
  return {
    excludedByPublisherId: input.excludedByPublisherId.trim(),
    excludedForPublisherId: input.excludedForPublisherId.trim(),
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

const mapCreateManyInput = (input: OrganizationExclusionCreateManyInput): Prisma.OrganizationExclusionCreateManyInput => {
  return {
    excludedByPublisherId: input.excludedByPublisherId.trim(),
    excludedForPublisherId: input.excludedForPublisherId.trim(),
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

export const organizationExclusionService = (() => {
  const findExclusionsByExcludedByPublisherId = async (publisherId: string): Promise<OrganizationExclusionRecord[]> => {
    if (!publisherId) {
      return [];
    }
    return await organizationExclusionRepository.findMany({
      where: { excludedByPublisherId: publisherId },
    });
  };

  const findExclusionsByExcludedForPublisherId = async (publisherId: string): Promise<OrganizationExclusionRecord[]> => {
    if (!publisherId) {
      return [];
    }
    return await organizationExclusionRepository.findMany({
      where: { excludedForPublisherId: publisherId },
    });
  };

  const findExclusionsByPublisherIds = async (
    excludedByPublisherId: string,
    excludedForPublisherId: string
  ): Promise<OrganizationExclusionRecord[]> => {
    if (!excludedByPublisherId || !excludedForPublisherId) {
      return [];
    }
    return await organizationExclusionRepository.findMany({
      where: {
        excludedByPublisherId,
        excludedForPublisherId,
      },
    });
  };

  const findExclusionsByPublisherAndOrganization = async (
    excludedByPublisherId: string,
    organizationClientId: string
  ): Promise<OrganizationExclusionRecord[]> => {
    if (!excludedByPublisherId || !organizationClientId) {
      return [];
    }
    return await organizationExclusionRepository.findMany({
      where: {
        excludedByPublisherId,
        organizationClientId,
      },
    });
  };

  const createExclusion = async (input: OrganizationExclusionCreateInput): Promise<OrganizationExclusionRecord> => {
    return await organizationExclusionRepository.create({
      data: mapCreateInput(input),
    });
  };

  const createManyExclusions = async (inputs: OrganizationExclusionCreateManyInput[]): Promise<number> => {
    if (!inputs.length) {
      return 0;
    }
    const result = await organizationExclusionRepository.createMany({
      data: inputs.map(mapCreateManyInput),
      skipDuplicates: true,
    });
    return result.count;
  };

  const deleteExclusionsByPublisherAndOrganization = async (
    excludedByPublisherId: string,
    organizationClientId: string
  ): Promise<number> => {
    if (!excludedByPublisherId || !organizationClientId) {
      return 0;
    }
    const result = await organizationExclusionRepository.deleteMany({
      where: {
        excludedByPublisherId,
        organizationClientId,
      },
    });
    return result.count;
  };

  return {
    findExclusionsByExcludedByPublisherId,
    findExclusionsByExcludedForPublisherId,
    findExclusionsByPublisherIds,
    findExclusionsByPublisherAndOrganization,
    createExclusion,
    createManyExclusions,
    deleteExclusionsByPublisherAndOrganization,
  };
})();

