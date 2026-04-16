import { TaxonomyValue, UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  findTaxonomyValuesByPrefixedKeys(
    pairs: Array<{ taxonomyKey: string; valueKey: string }>
  ): Promise<Array<{ id: string; key: string; taxonomyKey: string; active: boolean }>> {
    if (pairs.length === 0) return Promise.resolve([]);
    return prisma.taxonomyValue
      .findMany({
        where: {
          OR: pairs.map(({ taxonomyKey, valueKey }) => ({
            key: valueKey,
            taxonomy: { key: taxonomyKey },
          })),
        },
        select: { id: true, key: true, active: true, taxonomy: { select: { key: true } } },
      })
      .then((rows) => rows.map((r) => ({ id: r.id, key: r.key, taxonomyKey: r.taxonomy.key, active: r.active })));
  },

  create(params: {
    expiresAt: Date;
    taxonomyValueIds: string[];
    geo?: { lat: number; lon: number; radiusKm?: number };
  }): Promise<UserScoring> {
    return prisma.userScoring.create({
      data: {
        expiresAt: params.expiresAt,
        values: {
          createMany: {
            data: params.taxonomyValueIds.map((id) => ({ taxonomyValueId: id, score: 1.0 })),
          },
        },
        ...(params.geo
          ? {
              geo: {
                create: {
                  lat: params.geo.lat,
                  lon: params.geo.lon,
                  radiusKm: params.geo.radiusKm,
                },
              },
            }
          : {}),
      },
    });
  },
};
