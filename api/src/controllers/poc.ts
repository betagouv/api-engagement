import { Router } from "express";
import zod from "zod";

import { prisma } from "@/db/postgres";
import { INVALID_QUERY } from "@/error";
import { matchingEngineService } from "@/services/matching-engine";

const router = Router();

// GET /poc/taxonomy — all active taxonomies with their active values
router.get("/taxonomy", async (req, res, next) => {
  try {
    const taxonomies = await prisma.taxonomy.findMany({
      include: {
        values: {
          where: { active: true },
          orderBy: [{ order: "asc" }, { label: "asc" }],
        },
      },
      orderBy: { label: "asc" },
    });
    return res.status(200).send({ ok: true, data: taxonomies });
  } catch (error) {
    next(error);
  }
});

const matchQuerySchema = zod.object({
  userScoringId: zod.string().uuid(),
  limit: zod.coerce.number().int().min(1).max(100).default(20),
});

// GET /poc/match?userScoringId=<uuid>&limit=20 — ranked missions with debug info
router.get("/match", async (req, res, next) => {
  try {
    const query = matchQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const { userScoringId, limit } = query.data;

    const result = await matchingEngineService.rankMissionsByUserScoring({ userScoringId, limit });

    if (result.items.length === 0) {
      return res.status(200).send({ ok: true, data: { tookMs: result.tookMs, items: [] } });
    }

    const missionIds = result.items.map((item) => item.missionId);
    const missionScoringIds = result.items.map((item) => item.missionScoringId);

    const [missionRows, scoringValueRows, userScoringValues] = await Promise.all([
      prisma.mission.findMany({
        where: { id: { in: missionIds } },
        select: {
          id: true,
          title: true,
          description: true,
          tasks: true,
          audience: true,
          softSkills: true,
          requirements: true,
          tags: true,
          type: true,
          remote: true,
          openToMinors: true,
          reducedMobilityAccessible: true,
          duration: true,
          schedule: true,
          startAt: true,
          endAt: true,
          domainOriginal: true,
          publisher: { select: { name: true } },
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
          score: true,
          taxonomyValue: {
            select: {
              key: true,
              label: true,
              taxonomy: { select: { key: true } },
            },
          },
          missionEnrichmentValue: { select: { confidence: true, evidence: true } },
        },
      }),
      prisma.userScoringValue.findMany({
        where: { userScoringId },
        select: { taxonomyValue: { select: { taxonomy: { select: { key: true } } } } },
      }),
    ]);

    const selectedDimensions = [...new Set(userScoringValues.map((v) => v.taxonomyValue.taxonomy.key))];

    const missionIndex: Record<string, {
      title: string;
      city: string | null;
      description: string | null;
      tasks: string[];
      audience: string[];
      softSkills: string[];
      requirements: string[];
      tags: string[];
      type: string | null;
      remote: string | null;
      openToMinors: boolean | null;
      reducedMobilityAccessible: boolean | null;
      duration: number | null;
      schedule: string | null;
      startAt: Date | null;
      endAt: Date | null;
      domainOriginal: string | null;
      publisherName: string | null;
    }> = {};
    for (const m of missionRows) {
      missionIndex[m.id] = {
        title: m.title,
        city: m.addresses[0]?.city ?? null,
        description: m.description ?? null,
        tasks: m.tasks,
        audience: m.audience,
        softSkills: m.softSkills,
        requirements: m.requirements,
        tags: m.tags,
        type: m.type ?? null,
        remote: m.remote ?? null,
        openToMinors: m.openToMinors ?? null,
        reducedMobilityAccessible: m.reducedMobilityAccessible ?? null,
        duration: m.duration ?? null,
        schedule: m.schedule ?? null,
        startAt: m.startAt ?? null,
        endAt: m.endAt ?? null,
        domainOriginal: m.domainOriginal ?? null,
        publisherName: m.publisher?.name ?? null,
      };
    }

    const valuesIndex: Record<string, { dimensionKey: string; taxonomyValueKey: string; taxonomyValueLabel: string; enrichmentConfidence: number; scoringScore: number; evidence: unknown }[]> = {};
    for (const row of scoringValueRows) {
      const entry = {
        dimensionKey: row.taxonomyValue.taxonomy.key,
        taxonomyValueKey: row.taxonomyValue.key,
        taxonomyValueLabel: row.taxonomyValue.label,
        enrichmentConfidence: row.missionEnrichmentValue?.confidence ?? 0,
        scoringScore: row.score,
        evidence: row.missionEnrichmentValue?.evidence ?? null,
      };
      (valuesIndex[row.missionScoringId] ??= []).push(entry);
    }

    const items = result.items.map((item) => ({
      missionId: item.missionId,
      missionScoringId: item.missionScoringId,
      title: missionIndex[item.missionId]?.title ?? "(unknown)",
      publisherName: missionIndex[item.missionId]?.publisherName ?? null,
      city: missionIndex[item.missionId]?.city ?? null,
      mission: missionIndex[item.missionId] ? {
        description: missionIndex[item.missionId].description,
        tasks: missionIndex[item.missionId].tasks,
        audience: missionIndex[item.missionId].audience,
        softSkills: missionIndex[item.missionId].softSkills,
        requirements: missionIndex[item.missionId].requirements,
        tags: missionIndex[item.missionId].tags,
        type: missionIndex[item.missionId].type,
        remote: missionIndex[item.missionId].remote,
        openToMinors: missionIndex[item.missionId].openToMinors,
        reducedMobilityAccessible: missionIndex[item.missionId].reducedMobilityAccessible,
        duration: missionIndex[item.missionId].duration,
        schedule: missionIndex[item.missionId].schedule,
        startAt: missionIndex[item.missionId].startAt,
        endAt: missionIndex[item.missionId].endAt,
        domainOriginal: missionIndex[item.missionId].domainOriginal,
      } : null,
      totalScore: item.totalScore,
      taxonomyScore: item.taxonomyScore,
      geoScore: item.geoScore,
      distanceKm: item.distanceKm,
      dimensionScores: item.dimensionScores,
      values: valuesIndex[item.missionScoringId] ?? [],
    }));

    return res.status(200).send({ ok: true, data: { tookMs: result.tookMs, selectedDimensions, items } });
  } catch (error) {
    next(error);
  }
});

export default router;
