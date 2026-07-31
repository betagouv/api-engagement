import { isValidTaxonomyValueKey } from "@engagement/taxonomy";

import { prisma } from "@/db/postgres";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/search/collections/missions/fields";
import { MissionIndexDocument } from "@/services/search/collections/missions/types";

const buildEmptyTaxonomyIndex = (): Record<IndexedTaxonomyKey, string[]> => {
  return Object.fromEntries(INDEXED_TAXONOMY_KEYS.map((key) => [key, []])) as unknown as Record<IndexedTaxonomyKey, string[]>;
};

const buildTaxonomyIndex = (
  values: Array<{
    taxonomyKey: string | null;
    valueKey: string | null;
  }>
): Record<IndexedTaxonomyKey, string[]> => {
  const indexedValues = buildEmptyTaxonomyIndex();

  for (const value of values) {
    if (!value.taxonomyKey || !value.valueKey) {
      continue;
    }

    const taxonomyValueKey = `${value.taxonomyKey}.${value.valueKey}`;
    if (!isValidTaxonomyValueKey(taxonomyValueKey)) {
      continue;
    }

    const taxonomyKey = value.taxonomyKey as IndexedTaxonomyKey;
    if (!(taxonomyKey in indexedValues)) {
      continue;
    }

    indexedValues[taxonomyKey].push(value.valueKey);
  }

  return Object.fromEntries(Object.entries(indexedValues).map(([key, values]) => [key, [...new Set(values)]])) as Record<IndexedTaxonomyKey, string[]>;
};

export const missionIndexService = {
  async upsert(missionId: string): Promise<void> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        title: true,
        publisherId: true,
        publisherOrganizationId: true,
        deletedAt: true,
        statusCode: true,
        remote: true,
        schedule: true,
        duration: true,
        startAt: true,
        createdAt: true,
        openToMinors: true,
        reducedMobilityAccessible: true,
        closeToTransport: true,
        tasks: true,
        audience: true,
        tags: true,
        domain: {
          select: { name: true },
        },
        publisherOrganization: {
          select: { clientId: true, name: true, parentOrganizations: true },
        },
        addresses: {
          select: { city: true, departmentCode: true, departmentName: true, postalCode: true, region: true, country: true, locationLat: true, locationLon: true },
        },
        activities: {
          select: { activity: { select: { name: true } } },
        },
        missionDiffusions: {
          select: { distributionPublisherId: true },
        },
        moderationStatuses: {
          where: { status: "ACCEPTED" },
          select: { publisherId: true },
        },
        missionScorings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            missionScoringValues: {
              where: { score: { gt: 0 } },
              select: { taxonomyKey: true, valueKey: true },
            },
          },
        },
      },
    });

    if (!mission || mission.deletedAt !== null || mission.statusCode !== "ACCEPTED") {
      await this.delete(missionId);
      return;
    }

    const uniqueStrings = (values: Array<string | null | undefined>): string[] => [...new Set(values.filter((value): value is string => Boolean(value)))];
    const departmentCodes = uniqueStrings(mission.addresses.map((address) => address.departmentCode));
    const departmentNames = uniqueStrings(mission.addresses.map((address) => address.departmentName));
    const locations = mission.addresses
      .filter((address): address is typeof address & { locationLat: number; locationLon: number } => address.locationLat != null && address.locationLon != null)
      .map((address) => [address.locationLat, address.locationLon] satisfies [number, number]);
    // Diffuseurs autorisés issus du snapshot mission_diffusion. Toujours renseigné, y compris `[]`.
    const distributionPublisherIds = uniqueStrings(mission.missionDiffusions.map((diffusion) => diffusion.distributionPublisherId));
    const taxonomyIndex = buildTaxonomyIndex(mission.missionScorings[0]?.missionScoringValues ?? []);

    const document: MissionIndexDocument = {
      id: mission.id,
      publisherId: mission.publisherId ?? "",
      distributionPublisherIds,
      moderationAcceptedPublisherIds: uniqueStrings(mission.moderationStatuses.map((moderation) => moderation.publisherId)),
      ...(mission.publisherOrganizationId ? { publisherOrganizationId: mission.publisherOrganizationId } : {}),
      ...(mission.publisherOrganization?.clientId ? { publisherOrganizationClientId: mission.publisherOrganization.clientId } : {}),
      ...(mission.publisherOrganization?.clientId
        ? { publisherOrganizationFacet: `${mission.publisherOrganization.clientId}|||${mission.publisherOrganization.name ?? mission.publisherOrganization.clientId}` }
        : {}),
      publisherOrganizationParentOrganizations: mission.publisherOrganization?.parentOrganizations ?? [],
      title: mission.title,
      ...(mission.domain?.name ? { mission_domain: mission.domain.name } : {}),
      departmentCodes,
      departmentNames,
      cityNames: uniqueStrings(mission.addresses.map((address) => address.city)),
      postalCodes: uniqueStrings(mission.addresses.map((address) => address.postalCode)),
      regionNames: uniqueStrings(mission.addresses.map((address) => address.region)),
      countryCodes: uniqueStrings(mission.addresses.map((address) => address.country)),
      ...(locations.length ? { locations } : {}),
      ...(mission.remote ? { remote: mission.remote } : {}),
      ...(mission.schedule ? { schedule: mission.schedule } : {}),
      ...(mission.duration != null ? { duration: mission.duration } : {}),
      ...(mission.startAt ? { startAt: Math.floor(mission.startAt.getTime() / 1000) } : {}),
      createdAt: Math.floor(mission.createdAt.getTime() / 1000),
      ...(mission.openToMinors != null ? { openToMinors: mission.openToMinors } : {}),
      ...(mission.reducedMobilityAccessible != null ? { reducedMobilityAccessible: mission.reducedMobilityAccessible } : {}),
      ...(mission.closeToTransport != null ? { closeToTransport: mission.closeToTransport } : {}),
      tasks: mission.tasks,
      audience: mission.audience,
      tags: mission.tags,
      activities: uniqueStrings(mission.activities.map(({ activity }) => activity.name)),
      ...taxonomyIndex,
    };

    await missionSearchClient.upsert(document);
  },

  async delete(missionId: string): Promise<void> {
    try {
      await missionSearchClient.delete(missionId);
    } catch (err: unknown) {
      if ((err as { httpStatus?: number }).httpStatus !== 404) {
        throw err;
      }
    }
  },
};
