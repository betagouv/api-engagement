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
        publisherId: true,
        deletedAt: true,
        statusCode: true,
        addresses: {
          select: { departmentCode: true },
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

    const departmentCodes = [...new Set(mission.addresses.map((a) => a.departmentCode).filter((c): c is string => c !== null && c !== undefined))];
    const taxonomyIndex = buildTaxonomyIndex(mission.missionScorings[0]?.missionScoringValues ?? []);

    const document: MissionIndexDocument = {
      id: mission.id,
      publisherId: mission.publisherId ?? "",
      departmentCodes,
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
