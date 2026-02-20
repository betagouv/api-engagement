import { Prisma, Publisher, PublisherDiffusionExclusion } from "@/db/core";
import { publisherDiffusionExclusionRepository } from "@/repositories/publisher-diffusion-exclusion";
import {
  PublisherDiffusionExclusionCreateInput,
  PublisherDiffusionExclusionCreateManyInput,
  PublisherDiffusionExclusionFindParams,
  PublisherDiffusionExclusionRecord,
} from "@/types/publisher-diffusion-exclusion";
import { normalizeOptionalString } from "@/utils/normalize";

type PublisherDiffusionExclusionWithPublishers = PublisherDiffusionExclusion & {
  excludedByAnnonceur: Publisher;
  excludedForDiffuseur: Publisher;
};

const mapCreateInput = (input: PublisherDiffusionExclusionCreateInput): Prisma.PublisherDiffusionExclusionCreateInput => {
  return {
    excludedByAnnonceur: { connect: { id: input.excludedByAnnonceurId.trim() } },
    excludedForDiffuseur: { connect: { id: input.excludedForDiffuseurId.trim() } },
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

const mapCreateManyInput = (input: PublisherDiffusionExclusionCreateManyInput): Prisma.PublisherDiffusionExclusionCreateManyInput => {
  return {
    excludedByAnnonceurId: input.excludedByAnnonceurId.trim(),
    excludedForDiffuseurId: input.excludedForDiffuseurId.trim(),
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
  };
};

export const publisherDiffusionExclusionService = (() => {
  const toPublisherDiffusionExclusionRecord = (exclusion: PublisherDiffusionExclusionWithPublishers): PublisherDiffusionExclusionRecord => {
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

  const findExclusions = async (params: PublisherDiffusionExclusionFindParams = {}): Promise<PublisherDiffusionExclusionRecord[]> => {
    const and: Prisma.PublisherDiffusionExclusionWhereInput[] = [];

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

    const exclusions = (await publisherDiffusionExclusionRepository.findMany({
      where: { AND: and },
      include: { excludedByAnnonceur: { select: { id: true, name: true } }, excludedForDiffuseur: { select: { id: true, name: true } } },
    })) as PublisherDiffusionExclusionWithPublishers[];
    return exclusions.map(toPublisherDiffusionExclusionRecord);
  };

  const findExclusionsForDiffuseurId = async (publisherId: string): Promise<PublisherDiffusionExclusionRecord[]> => {
    if (!publisherId) {
      return [];
    }
    const exclusions = (await publisherDiffusionExclusionRepository.findMany({
      where: { excludedForDiffuseurId: publisherId },
      include: { excludedByAnnonceur: { select: { id: true, name: true } }, excludedForDiffuseur: { select: { id: true, name: true } } },
    })) as PublisherDiffusionExclusionWithPublishers[];
    return exclusions.map(toPublisherDiffusionExclusionRecord);
  };

  const createExclusion = async (input: PublisherDiffusionExclusionCreateInput): Promise<PublisherDiffusionExclusionRecord> => {
    const exclusion = (await publisherDiffusionExclusionRepository.create({
      data: mapCreateInput(input),
      include: { excludedByAnnonceur: { select: { id: true, name: true } }, excludedForDiffuseur: { select: { id: true, name: true } } },
    })) as PublisherDiffusionExclusionWithPublishers;
    return toPublisherDiffusionExclusionRecord(exclusion);
  };

  const createManyExclusions = async (inputs: PublisherDiffusionExclusionCreateManyInput[]): Promise<number> => {
    if (!inputs.length) {
      return 0;
    }
    const result = await publisherDiffusionExclusionRepository.createMany({
      data: inputs.map(mapCreateManyInput),
      skipDuplicates: true,
    });
    return result.count;
  };

  const deleteExclusionsByAnnonceurAndOrganization = async (excludedByAnnonceurId: string, organizationClientId: string): Promise<number> => {
    if (!excludedByAnnonceurId || !organizationClientId) {
      return 0;
    }
    const result = await publisherDiffusionExclusionRepository.deleteMany({
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
