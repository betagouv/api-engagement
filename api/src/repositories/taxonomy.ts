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

  findManyLegacyValuesByPrefixedKeys(
    keys: string[]
  ): Promise<Array<{ id: string; key: string; taxonomyKey: string; active: boolean }>> {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.taxonomyValue
      .findMany({
        where: {
          OR: keys
            .map((key) => {
              const dotIndex = key.indexOf(".");
              if (dotIndex <= 0 || dotIndex === key.length - 1) {
                return null;
              }

              return {
                key: key.slice(dotIndex + 1),
                taxonomy: { is: { key: key.slice(0, dotIndex) as never } },
              };
            })
            .filter((value): value is NonNullable<typeof value> => value !== null),
        },
        select: {
          id: true,
          key: true,
          active: true,
          taxonomy: { select: { key: true } },
        },
      })
      .then((rows) => rows.map((row) => ({ id: row.id, key: row.key, taxonomyKey: row.taxonomy.key, active: row.active })));
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
