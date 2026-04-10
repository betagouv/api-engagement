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
};
