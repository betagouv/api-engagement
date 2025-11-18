import { OrganizationExclusion, Prisma, Publisher } from "../db/core";
import { organizationExclusionRepository } from "../repositories/organization-exclusion";
import {
  OrganizationExclusionCreateInput,
  OrganizationExclusionCreateManyInput,
  OrganizationExclusionFindParams,
  OrganizationExclusionRecord,
} from "../types/organization-exclusion";
import { normalizeOptionalString } from "../utils/normalize";

type OrganizationExclusionWithPublishers = OrganizationExclusion & {
  excludedByAnnonceur: Publisher;
  excludedForDiffuseur: Publisher;
};

const mapCreateInput = (input: OrganizationExclusionCreateInput): Prisma.OrganizationExclusionCreateInput => {
  return {
    excludedByAnnonceur: { connect: { id: input.excludedByAnnonceurId.trim() } },
    excludedForDiffuseur: { connect: { id: input.excludedForDiffuseurId.trim() } },
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

const mapCreateManyInput = (input: OrganizationExclusionCreateManyInput): Prisma.OrganizationExclusionCreateManyInput => {
  return {
    excludedByAnnonceurId: input.excludedByAnnonceurId.trim(),
    excludedForDiffuseurId: input.excludedForDiffuseurId.trim(),
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

export const organizationExclusionService = (() => {
  const toOrganizationExclusionRecord = (exclusion: OrganizationExclusionWithPublishers): OrganizationExclusionRecord => {
    return {
      id: exclusion.id,
      excludedByAnnonceurId: exclusion.excludedByAnnonceurId,
      excludedByAnnonceurName: exclusion.excludedByAnnonceur.name,
      excludedForDiffuseurId: exclusion.excludedForDiffuseurId,
      excludedForDiffuseurName: exclusion.excludedForDiffuseur.name,
      organizationClientId: exclusion.organizationClientId,
      organizationName: exclusion.organizationName,
      createdAt: exclusion.createdAt,
      updatedAt: exclusion.updatedAt,
    };
  };

  const findExclusions = async (params: OrganizationExclusionFindParams = {}): Promise<OrganizationExclusionRecord[]> => {
    const and: Prisma.OrganizationExclusionWhereInput[] = [];

    if (params.excludedByAnnonceurId) {
      and.push({ excludedByAnnonceurId: params.excludedByAnnonceurId });
    }
    if (params.excludedForDiffuseurId) {
      and.push({ excludedForDiffuseurId: params.excludedForDiffuseurId });
    }
    if (params.organizationClientId) {
      and.push({ organizationClientId: params.organizationClientId });
    }
    if (params.organizationName) {
      and.push({ organizationName: params.organizationName });
    }

    const exclusions = (await organizationExclusionRepository.findMany({
      where: { AND: and },
      include: { excludedByAnnonceur: true, excludedForDiffuseur: true },
    })) as OrganizationExclusionWithPublishers[];
    return exclusions.map(toOrganizationExclusionRecord);
  };

  const findExclusionsForDiffuseurId = async (publisherId: string): Promise<OrganizationExclusionRecord[]> => {
    if (!publisherId) {
      return [];
    }
    const exclusions = (await organizationExclusionRepository.findMany({
      where: { excludedForDiffuseurId: publisherId },
      include: { excludedByAnnonceur: true, excludedForDiffuseur: true },
    })) as OrganizationExclusionWithPublishers[];
    return exclusions.map(toOrganizationExclusionRecord);
  };

  const createExclusion = async (input: OrganizationExclusionCreateInput): Promise<OrganizationExclusionRecord> => {
    const exclusion = (await organizationExclusionRepository.create({
      data: mapCreateInput(input),
    })) as OrganizationExclusionWithPublishers;
    return toOrganizationExclusionRecord(exclusion);
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

  const deleteExclusionsByAnnonceurAndOrganization = async (excludedByAnnonceurId: string, organizationClientId: string): Promise<number> => {
    if (!excludedByAnnonceurId || !organizationClientId) {
      return 0;
    }
    const result = await organizationExclusionRepository.deleteMany({
      where: {
        excludedByAnnonceurId,
        organizationClientId,
      },
    });
    return result.count;
  };

  return {
    findExclusions,
    findExclusionsForDiffuseurId,
    createExclusion,
    createManyExclusions,
    deleteExclusionsByAnnonceurAndOrganization,
  };
})();
