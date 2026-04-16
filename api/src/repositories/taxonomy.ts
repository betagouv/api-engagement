import { Prisma, Taxonomy, TaxonomyValue } from "@/db/core";
import { prisma } from "@/db/postgres";

export const taxonomyRepository = {
  findMany(params: Prisma.TaxonomyFindManyArgs = {}): Promise<Taxonomy[]> {
    return prisma.taxonomy.findMany(params);
  },

  findManyWithValues(
    params: Prisma.TaxonomyFindManyArgs = {},
  ): Promise<(Taxonomy & { values: TaxonomyValue[] })[]> {
    return prisma.taxonomy.findMany({
      ...params,
      include: { values: true },
    });
  },

  findManyValuesByPrefixedKeys(prefixedKeys: string[]): Promise<Array<{ id: string; key: string }>> {
    if (prefixedKeys.length === 0) return Promise.resolve([]);
    const pairs = prefixedKeys.map((pk) => {
      const dot = pk.indexOf(".");
      return { taxonomyKey: pk.slice(0, dot), valueKey: pk.slice(dot + 1) };
    });
    return prisma.taxonomyValue.findMany({
      where: {
        OR: pairs.map(({ taxonomyKey, valueKey }) => ({
          key: valueKey,
          taxonomy: { key: taxonomyKey },
        })),
      },
      select: { id: true, key: true },
    });
  },
};
