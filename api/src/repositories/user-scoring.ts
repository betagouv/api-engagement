import { TaxonomyValue, UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  findTaxonomyValuesByKeys(keys: string[]): Promise<Pick<TaxonomyValue, "id" | "key" | "active">[]> {
    return prisma.taxonomyValue.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true, active: true },
    });
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
