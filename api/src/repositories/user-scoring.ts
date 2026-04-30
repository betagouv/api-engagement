import type { UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  findById(id: string): Promise<Pick<UserScoring, "id" | "distinctId"> | null> {
    return prisma.userScoring.findUnique({
      where: { id },
      select: { id: true, distinctId: true },
    });
  },

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

  update(params: {
    userScoringId: string;
    values: Array<{ taxonomyKey: string; valueKey: string; score?: number }>;
    missionAlertEnabled?: boolean;
  }): Promise<{ createdCount: number; missionAlertEnabled: boolean }> {
    return prisma.$transaction(async (tx) => {
      const createdValues = params.values.length
        ? await tx.userScoringValue.createMany({
            data: params.values.map((value) => ({
              userScoringId: params.userScoringId,
              taxonomyKey: value.taxonomyKey,
              valueKey: value.valueKey,
              score: value.score ?? 1.0,
            })),
            skipDuplicates: true,
          })
        : { count: 0 };

      const userScoring = await tx.userScoring.update({
        where: { id: params.userScoringId },
        data: params.missionAlertEnabled === undefined ? { updatedAt: new Date() } : { missionAlertEnabled: params.missionAlertEnabled },
        select: { missionAlertEnabled: true },
      });

      return {
        createdCount: createdValues.count,
        missionAlertEnabled: userScoring.missionAlertEnabled,
      };
    });
  },
};
