import { Prisma, Publisher, PublisherDiffusionExclusion, PublisherOrganization } from "@/db/core";
import { publisherDiffusionExclusionRepository } from "@/repositories/publisher-diffusion-exclusion";
import { PublisherDiffusionExclusionCreateInput, PublisherDiffusionExclusionCreateManyInput, PublisherDiffusionExclusionRecord } from "@/types/publisher-diffusion-exclusion";
import { normalizeOptionalString } from "@/utils/normalize";

type PublisherDiffusionExclusionWithRelation = PublisherDiffusionExclusion & {
  excludedByAnnonceur: Publisher;
  excludedForDiffuseur: Publisher;
  publisherOrganization: PublisherOrganization;
};

const mapCreateInput = (input: PublisherDiffusionExclusionCreateInput): Prisma.PublisherDiffusionExclusionCreateInput => {
  return {
    excludedByAnnonceur: { connect: { id: input.excludedByAnnonceurId.trim() } },
    excludedForDiffuseur: { connect: { id: input.excludedForDiffuseurId.trim() } },
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
    publisherOrganization: input.publisherOrganizationId ? { connect: { id: input.publisherOrganizationId } } : undefined,
  };
};

const mapCreateManyInput = (input: PublisherDiffusionExclusionCreateManyInput): Prisma.PublisherDiffusionExclusionCreateManyInput => {
  return {
    excludedByAnnonceurId: input.excludedByAnnonceurId.trim(),
    excludedForDiffuseurId: input.excludedForDiffuseurId.trim(),
    organizationClientId: normalizeOptionalString(input.organizationClientId) ?? null,
    organizationName: normalizeOptionalString(input.organizationName) ?? null,
    publisherOrganizationId: input.publisherOrganizationId ?? null,
  };
};

const defaultInclude = {
  excludedByAnnonceur: { select: { id: true, name: true } },
  excludedForDiffuseur: { select: { id: true, name: true } },
  publisherOrganization: { select: { id: true, clientId: true, name: true } },
};

export const publisherDiffusionExclusionService = (() => {
  const toPublisherDiffusionExclusionRecord = (exclusion: PublisherDiffusionExclusionWithRelation): PublisherDiffusionExclusionRecord => {
    return {
      id: exclusion.id,
      excludedByAnnonceurId: exclusion.excludedByAnnonceurId,
      excludedByAnnonceurName: exclusion.excludedByAnnonceur.name,
      excludedForDiffuseurId: exclusion.excludedForDiffuseurId,
      excludedForDiffuseurName: exclusion.excludedForDiffuseur.name,
      organizationClientId: exclusion.publisherOrganization.clientId,
      organizationName: exclusion.publisherOrganization.name,
      publisherOrganizationId: exclusion.publisherOrganizationId,
      createdAt: exclusion.createdAt,
      updatedAt: exclusion.updatedAt,
    };
  };

  const findExclusionsForDiffuseurId = async (publisherId: string): Promise<PublisherDiffusionExclusionRecord[]> => {
    if (!publisherId) {
      return [];
    }
    const exclusions = (await publisherDiffusionExclusionRepository.findMany({
      where: { excludedForDiffuseurId: publisherId },
      include: defaultInclude,
    })) as PublisherDiffusionExclusionWithRelation[];
    return exclusions.map(toPublisherDiffusionExclusionRecord);
  };

  const createExclusion = async (input: PublisherDiffusionExclusionCreateInput): Promise<PublisherDiffusionExclusionRecord> => {
    const exclusion = (await publisherDiffusionExclusionRepository.create({
      data: mapCreateInput(input),
      include: defaultInclude,
    })) as PublisherDiffusionExclusionWithRelation;
    return toPublisherDiffusionExclusionRecord(exclusion);
  };

  const updateExclusionsForPublisherOrganization = async (
    publisherOrganizationId: string,
    excludedByAnnonceurId: string,
    exclusions: PublisherDiffusionExclusionCreateManyInput[]
  ): Promise<PublisherDiffusionExclusionRecord[]> => {
    await publisherDiffusionExclusionRepository.deleteMany({
      where: {
        excludedByAnnonceurId,
        publisherOrganizationId,
      },
    });
    await publisherDiffusionExclusionRepository.createMany({
      data: exclusions.map(mapCreateManyInput),
      skipDuplicates: true,
    });

    const newExclusions = await publisherDiffusionExclusionRepository.findMany({
      where: {
        excludedByAnnonceurId,
        publisherOrganizationId,
      },
      include: defaultInclude,
    });
    return newExclusions.map((exclusion) => toPublisherDiffusionExclusionRecord(exclusion as PublisherDiffusionExclusionWithRelation));
  };
  return {
    findExclusionsForDiffuseurId,
    createExclusion,
    updateExclusionsForPublisherOrganization,
  };
})();
