import type { UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  create(params: {
    expiresAt: Date;
    values: Array<{ taxonomyKey: string; valueKey: string; score?: number }>;
    geo?: { lat: number; lon: number; radiusKm?: number };
    distinctId?: string;
    missionAlertEnabled: boolean;
  }): Promise<UserScoring> {
    return prisma.userScoring.create({
      data: {
        expiresAt: params.expiresAt,
        distinctId: params.distinctId,
        missionAlertEnabled: params.missionAlertEnabled,
        values: {
          createMany: {
            data: params.values.map((value) => ({
              taxonomyKey: value.taxonomyKey,
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
