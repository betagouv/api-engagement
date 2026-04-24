import { prisma } from "@/db/postgres";
import type { UserScoring } from "@/db/core";

export const userScoringRepository = {
  findTaxonomyValuesByPrefixedKeys(pairs: Array<{ taxonomyKey: string; valueKey: string }>): Promise<Array<{ id: string; key: string; taxonomyKey: string; active: boolean }>> {
    if (pairs.length === 0) {
      return Promise.resolve([]);
    }
    return prisma.taxonomyValue
      .findMany({
        where: {
          OR: pairs.map(({ taxonomyKey, valueKey }) => ({
            key: valueKey,
            taxonomy: { is: { key: taxonomyKey as never } },
          })),
        },
        select: { id: true, key: true, active: true, taxonomy: { select: { key: true } } },
      })
      .then((rows) => rows.map((r) => ({ id: r.id, key: r.key, taxonomyKey: r.taxonomy.key, active: r.active })));
  },

  create(params: {
    expiresAt: Date;
    values: Array<{ taxonomyValueId?: string | null; dimensionKey: string; valueKey: string; score?: number }>;
    geo?: { lat: number; lon: number; radiusKm?: number };
  }): Promise<UserScoring> {
    return prisma.userScoring.create({
      data: {
        expiresAt: params.expiresAt,
        values: {
          createMany: {
            data: params.values.map((value) => ({
              taxonomyValueId: value.taxonomyValueId ?? null,
              dimensionKey: value.dimensionKey,
              valueKey: value.valueKey,
              score: value.score ?? 1.0,
            })),
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
