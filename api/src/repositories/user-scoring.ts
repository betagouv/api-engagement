import type { UserScoring } from "@/db/core";
import { prisma } from "@/db/postgres";

export const userScoringRepository = {
  findById(id: string): Promise<Pick<UserScoring, "id" | "distinctId" | "missionAlertEnabled"> | null> {
    return prisma.userScoring.findUnique({
      where: { id },
      select: { id: true, distinctId: true, missionAlertEnabled: true },
    });
  },

  findEmailContext(id: string) {
    return prisma.userScoring.findUnique({
      where: { id },
      select: {
        answers: true,
        geo: { select: { address: true, city: true } },
        values: { select: { taxonomyKey: true, valueKey: true } },
      },
    });
  },

  create(params: {
    values: Array<{ taxonomyKey: string; valueKey: string; score?: number }>;
    answeredValues: Array<{ taxonomyKey: string; valueKey: string }>;
    geo?: { lat: number; lon: number; radiusKm?: number; countryCode?: string; address?: string; city?: string };
    distinctId?: string;
    missionAlertEnabled: boolean;
  }): Promise<UserScoring> {
    return prisma.userScoring.create({
      data: {
        distinctId: params.distinctId,
        missionAlertEnabled: params.missionAlertEnabled,
        answers: params.answeredValues,
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
                  address: params.geo.address,
                  city: params.geo.city,
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
    answeredValues: Array<{ taxonomyKey: string; valueKey: string }>;
    replaceAnswers: boolean;
    geo?: { lat: number; lon: number; radiusKm?: number; countryCode?: string; address?: string; city?: string };
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
          ...(params.replaceAnswers ? { answers: params.answeredValues } : {}),
          ...(params.geo
            ? {
                geo: {
                  upsert: {
                    create: {
                      lat: params.geo.lat,
                      lon: params.geo.lon,
                      radiusKm: params.geo.radiusKm,
                      countryCode: params.geo.countryCode,
                      address: params.geo.address,
                      city: params.geo.city,
                    },
                    update: {
                      lat: params.geo.lat,
                      lon: params.geo.lon,
                      radiusKm: params.geo.radiusKm,
                      countryCode: params.geo.countryCode,
                      address: params.geo.address ?? null,
                      city: params.geo.city ?? null,
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
