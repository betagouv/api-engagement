import type { UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  findById(id: string): Promise<Pick<UserScoring, "id" | "distinctId" | "missionAlertEnabled"> | null> {
    return prisma.userScoring.findUnique({
      where: { id },
      select: { id: true, distinctId: true, missionAlertEnabled: true },
    });
  },

  create(params: {
    expiresAt: Date;
    values: Array<{ taxonomyKey: string; valueKey: string; score?: number }>;
    geo?: { lat: number; lon: number; radiusKm?: number; countryCode?: string };
    distinctId?: string;
    missionAlertEnabled: boolean;
  }): Promise<UserScoring> {
    return prisma.userScoring.create({
      data: {
        expiresAt: params.expiresAt,
        distinctId: params.distinctId,
        missionAlertEnabled: params.missionAlertEnabled,
        ...(params.values.length
          ? {
              values: {
                createMany: {
                  data: params.values.map((value) => ({
                    taxonomyKey: value.taxonomyKey,
                    valueKey: value.valueKey,
                    score: value.score ?? 1.0,
                  })),
                },
              },
            }
          : {}),
        ...(params.geo
          ? {
              geo: {
                create: {
                  lat: params.geo.lat,
                  lon: params.geo.lon,
                  radiusKm: params.geo.radiusKm,
                  countryCode: params.geo.countryCode,
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
    replaceAnswers: boolean;
    geo?: { lat: number; lon: number; radiusKm?: number; countryCode?: string };
    missionAlertEnabled?: boolean;
  }): Promise<{ createdCount: number; missionAlertEnabled: boolean }> {
    return prisma.$transaction(async (tx) => {
      if (params.replaceAnswers) {
        await tx.userScoringValue.deleteMany({
          where: {
            userScoringId: params.userScoringId,
          },
        });

        if (!params.geo) {
          await tx.userScoringGeo.deleteMany({
            where: {
              userScoringId: params.userScoringId,
            },
          });
        }
      }

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
        data: {
          ...(params.missionAlertEnabled === undefined ? { updatedAt: new Date() } : { missionAlertEnabled: params.missionAlertEnabled }),
          ...(params.geo
            ? {
                geo: {
                  upsert: {
                    create: {
                      lat: params.geo.lat,
                      lon: params.geo.lon,
                      radiusKm: params.geo.radiusKm,
                      countryCode: params.geo.countryCode,
                    },
                    update: {
                      lat: params.geo.lat,
                      lon: params.geo.lon,
                      radiusKm: params.geo.radiusKm,
                      countryCode: params.geo.countryCode,
                    },
                  },
                },
              }
            : {}),
        },
        select: { missionAlertEnabled: true },
      });

      return {
        createdCount: createdValues.count,
        missionAlertEnabled: userScoring.missionAlertEnabled,
      };
    });
  },
};
