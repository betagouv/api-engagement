import { Prisma, Taxonomy, TaxonomyValue } from "@/db/core";
import { prisma } from "@/db/postgres";

export const taxonomyRepository = {
  findMany(params: Prisma.TaxonomyFindManyArgs = {}): Promise<Taxonomy[]> {
    return prisma.taxonomy.findMany(params);
  },

  findManyWithValues(params: Prisma.TaxonomyFindManyArgs = {}): Promise<(Taxonomy & { values: TaxonomyValue[] })[]> {
    return prisma.taxonomy.findMany({
      ...params,
      include: { values: true },
    });
  },

  findManyValuesByKeys(keys: string[]): Promise<Pick<TaxonomyValue, "id" | "key">[]> {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }
    return prisma.taxonomyValue.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
  },
};
