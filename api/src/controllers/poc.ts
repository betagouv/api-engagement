import { TAXONOMY } from "@engagement/taxonomy";
import { Router } from "express";
import zod from "zod";

import { prisma } from "@/db/postgres";
import { INVALID_QUERY } from "@/error";
import { matchingEngineService } from "@/services/matching-engine";

const router = Router();

const getPackageTaxonomyValueLabel = (taxonomyKey: string, valueKey: string): string | null => {
  const taxonomy = TAXONOMY[taxonomyKey as keyof typeof TAXONOMY] as { values: Record<string, { label: string }> } | undefined;
  if (!taxonomy) {
    return null;
  }

  const value = taxonomy.values[valueKey];
  return value?.label ?? null;
};

const matchQuerySchema = zod.object({
  userScoringId: zod.string().uuid(),
  limit: zod.coerce.number().int().min(1).max(100).default(20),
  offset: zod.coerce.number().int().min(0).default(0),
});

// GET /poc/match?userScoringId=<uuid>&limit=20 — ranked missions with debug info
router.get("/match", async (req, res, next) => {
  try {
    const query = matchQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { userScoringId, limit, offset } = query.data;

    const result = await matchingEngineService.rankMissionsByUserScoring({ userScoringId, limit, offset });

    if (result.items.length === 0) {
      return res.status(200).send({ ok: true, data: { tookMs: result.tookMs, items: [] } });
    }

    const missionIds = result.items.map((item) => item.missionId);
    const missionScoringIds = result.items.map((item) => item.missionScoringId);

    const [missionRows, scoringValueRows] = await Promise.all([
      prisma.mission.findMany({
        where: { id: { in: missionIds } },
        select: {
          id: true,
          title: true,
          remote: true,
          schedule: true,
          domainOriginal: true,
          domainLogo: true,
          domain: { select: { name: true } },
          publisher: { select: { name: true, logo: true, defaultMissionLogo: true } },
          publisherOrganization: { select: { name: true, logo: true } },
          addresses: {
            select: { city: true },
            take: 1,
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.missionScoringValue.findMany({
        where: { missionScoringId: { in: missionScoringIds } },
        select: {
          missionScoringId: true,
          taxonomyKey: true,
          valueKey: true,
          score: true,
          taxonomyValue: {
            select: {
              key: true,
              label: true,
              taxonomy: { select: { key: true } },
            },
          },
          missionEnrichmentValue: {
            select: {
              confidence: true,
              evidence: true,
            },
          },
        },
      }),
    ]);

    const missionIndex: Record<
      string,
      {
        title: string;
        city: string | null;
        remote: string | null;
        schedule: string | null;
        domain: string | null;
        domainOriginal: string | null;
        domainLogo: string | null;
        publisherName: string | null;
        publisherLogo: string | null;
        publisherDefaultMissionLogo: string | null;
        organizationName: string | null;
        organizationLogo: string | null;
      }
    > = {};
    for (const m of missionRows) {
      missionIndex[m.id] = {
        title: m.title,
        city: m.addresses[0]?.city ?? null,
        remote: m.remote ?? null,
        schedule: m.schedule ?? null,
        domain: m.domain?.name ?? null,
        domainOriginal: m.domainOriginal ?? null,
        domainLogo: m.domainLogo ?? null,
        publisherName: m.publisher?.name ?? null,
        publisherLogo: m.publisher?.logo ?? null,
        publisherDefaultMissionLogo: m.publisher?.defaultMissionLogo ?? null,
        organizationName: m.publisherOrganization?.name ?? null,
        organizationLogo: m.publisherOrganization?.logo ?? null,
      };
    }

    const valuesIndex: Record<
      string,
      { taxonomyKey: string; taxonomyValueKey: string; taxonomyValueLabel: string; enrichmentConfidence: number; scoringScore: number; evidence: unknown }[]
    > = {};
    for (const row of scoringValueRows) {
      const taxonomyKey = row.taxonomyKey ?? row.taxonomyValue?.taxonomy.key ?? "unknown";
      const taxonomyValueKey = row.valueKey ?? row.taxonomyValue?.key ?? "unknown";
      const taxonomyValueLabel = row.taxonomyValue?.label ?? getPackageTaxonomyValueLabel(taxonomyKey, taxonomyValueKey) ?? taxonomyValueKey;

      const entry = {
        taxonomyKey,
        taxonomyValueKey,
        taxonomyValueLabel,
        enrichmentConfidence: row.missionEnrichmentValue?.confidence ?? 0,
        scoringScore: row.score,
        evidence: row.missionEnrichmentValue?.evidence ?? null,
      };
      (valuesIndex[row.missionScoringId] ??= []).push(entry);
    }

    const items = result.items.map((item) => {
      const mission = missionIndex[item.missionId];
      const photo =
        missionIndex[item.missionId]?.domainLogo ??
        missionIndex[item.missionId]?.organizationLogo ??
        missionIndex[item.missionId]?.publisherDefaultMissionLogo ??
        missionIndex[item.missionId]?.publisherLogo ??
        null;

      return {
        mission: {
          id: item.missionId,
          title: mission?.title ?? "(unknown)",
          remote: mission?.remote ?? null,
          schedule: mission?.schedule ?? null,
          domain: mission?.domain ?? mission?.domainOriginal ?? null,
          domainOriginal: mission?.domainOriginal ?? null,
          organizationName: mission?.organizationName ?? null,
          publisherName: mission?.publisherName ?? null,
          media: {
            photo,
            domainLogo: mission?.domainLogo ?? null,
            organizationLogo: mission?.organizationLogo ?? null,
            publisherLogo: mission?.publisherLogo ?? null,
          },
          location: {
            city: item.closestCity ?? mission?.city ?? null,
            closestLat: item.closestLat,
            closestLon: item.closestLon,
            closestAddress: item.closestAddress,
          },
        },
        match: {
          missionScoringId: item.missionScoringId,
          totalScore: item.totalScore,
          taxonomyScore: item.taxonomyScore,
          geoScore: item.geoScore,
          taxonomyScores: item.taxonomyScores,
          values: valuesIndex[item.missionScoringId] ?? [],
        },
      };
    });

    return res.status(200).send({ ok: true, data: { tookMs: result.tookMs, items } });
  } catch (error) {
    next(error);
  }
});

export default router;
