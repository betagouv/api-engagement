import { isValidTaxonomyValueKey } from "@engagement/taxonomy";

import { prisma } from "@/db/postgres";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { INDEXED_TAXONOMY_KEYS, IndexedTaxonomyKey } from "@/services/search/collections/missions/fields";
import { MissionIndexDocument } from "@/services/search/collections/missions/types";

const buildEmptyTaxonomyIndex = (): Record<IndexedTaxonomyKey, string[]> => {
  return Object.fromEntries(INDEXED_TAXONOMY_KEYS.map((key) => [key, []])) as unknown as Record<IndexedTaxonomyKey, string[]>;
};

const buildTaxonomyIndex = (
  scorings: Array<{
    missionEnrichment: { promptVersion: string } | null;
    missionScoringValues: Array<{
      taxonomyKey: string | null;
      valueKey: string | null;
    }>;
  }>
): Record<IndexedTaxonomyKey, string[]> => {
  // Sélection ISO au matching (cf. `active_mission_scorings` dans matching-engine) : le scoring de la
  // version de prompt active gagne, avec repli sur le scoring complété le plus récent. Objectif :
  // tant que l'env n'a pas basculé, précalculer une nouvelle version n'altère ni le matching ni les
  // facettes de recherche. La requête trie déjà par `completedAt DESC` ; ce tri STABLE remonte les
  // scorings de la version active en tête sans casser cet ordre.
  const orderedScorings = [...scorings].sort(
    (a, b) => Number(b.missionEnrichment?.promptVersion === CURRENT_PROMPT_VERSION) - Number(a.missionEnrichment?.promptVersion === CURRENT_PROMPT_VERSION)
  );

  // On fusionne les facettes à travers les scorings retenus : pour chaque taxonomie, on conserve la
  // valeur du scoring le plus prioritaire qui la renseigne (`score > 0`). Une taxonomie absente de la
  // version active (nouveau jeu réduit) ou mise à 0 retombe donc sur un scoring plus ancien, ce qui
  // évite de perdre une facette historique — mais peut laisser réapparaître une facette qu'une version
  // plus récente a volontairement retirée.
  const indexedValues = buildEmptyTaxonomyIndex();
  const resolvedTaxonomies = new Set<IndexedTaxonomyKey>();

  for (const scoring of orderedScorings) {
    const valuesByTaxonomy = new Map<IndexedTaxonomyKey, string[]>();
    for (const value of scoring.missionScoringValues) {
      if (!value.taxonomyKey || !value.valueKey) {
        continue;
      }

      const taxonomyValueKey = `${value.taxonomyKey}.${value.valueKey}`;
      if (!isValidTaxonomyValueKey(taxonomyValueKey)) {
        continue;
      }

      const taxonomyKey = value.taxonomyKey as IndexedTaxonomyKey;
      if (!(taxonomyKey in indexedValues) || resolvedTaxonomies.has(taxonomyKey)) {
        continue;
      }

      const taxonomyValues = valuesByTaxonomy.get(taxonomyKey) ?? [];
      taxonomyValues.push(value.valueKey);
      valuesByTaxonomy.set(taxonomyKey, taxonomyValues);
    }

    for (const [taxonomyKey, values] of valuesByTaxonomy) {
      indexedValues[taxonomyKey] = [...new Set(values)];
      resolvedTaxonomies.add(taxonomyKey);
    }
  }

  return indexedValues;
};

export const missionIndexService = {
  async upsert(missionId: string): Promise<void> {
    const postgresStartedAt = Date.now();
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
          where: { isDeleted: false },
          select: { distributionPublisherId: true },
        },
        moderationStatuses: {
          where: { status: "ACCEPTED" },
          select: { publisherId: true },
        },
        missionScorings: {
          where: { missionEnrichment: { status: "completed" } },
          orderBy: [{ missionEnrichment: { completedAt: "desc" } }, { createdAt: "desc" }, { id: "desc" }],
          select: {
            missionEnrichment: { select: { promptVersion: true } },
            missionScoringValues: {
              where: { score: { gt: 0 } },
              select: { taxonomyKey: true, valueKey: true },
            },
          },
        },
      },
    });
    console.log(`[mission.index] dependency=postgres operation=mission.findUnique missionId=${missionId} durationMs=${Date.now() - postgresStartedAt}`);

    if (!mission || mission.deletedAt !== null || mission.statusCode !== "ACCEPTED") {
      await this.delete(missionId);
      return;
    }

    const buildStartedAt = Date.now();
    const uniqueStrings = (values: Array<string | null | undefined>): string[] => [...new Set(values.filter((value): value is string => Boolean(value)))];
    const departmentCodes = uniqueStrings(mission.addresses.map((address) => address.departmentCode));
    const departmentNames = uniqueStrings(mission.addresses.map((address) => address.departmentName));
    const locations = mission.addresses
      .filter((address): address is typeof address & { locationLat: number; locationLon: number } => address.locationLat != null && address.locationLon != null)
      .map((address) => [address.locationLat, address.locationLon] satisfies [number, number]);
    // Diffuseurs autorisés issus du snapshot mission_diffusion. Toujours renseigné, y compris `[]`.
    const distributionPublisherIds = uniqueStrings(mission.missionDiffusions.map((diffusion) => diffusion.distributionPublisherId));
    const taxonomyIndex = buildTaxonomyIndex(mission.missionScorings);

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

    console.log(`[mission.index] operation=document.build status=success missionId=${missionId} durationMs=${Date.now() - buildStartedAt}`);
    const typesenseStartedAt = Date.now();
    await missionSearchClient.upsert(document);
    console.log(`[mission.index] dependency=typesense operation=document.upsert missionId=${missionId} durationMs=${Date.now() - typesenseStartedAt}`);
  },

  async delete(missionId: string): Promise<void> {
    const typesenseStartedAt = Date.now();
    try {
      await missionSearchClient.delete(missionId);
    } catch (err: unknown) {
      if ((err as { httpStatus?: number }).httpStatus !== 404) {
        throw err;
      }
    } finally {
      console.log(`[mission.index] dependency=typesense operation=document.delete missionId=${missionId} durationMs=${Date.now() - typesenseStartedAt}`);
    }
  },
};
