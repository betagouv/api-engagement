import { MissionEnrichment, MissionEnrichmentStatus, MissionScoring } from "@/db/core";
import { prisma } from "@/db/postgres";
import { matchingCatalogRepository } from "@/repositories/matching-catalog";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import type { TaxonomyKey } from "@engagement/taxonomy";

export const createTestMissionEnrichment = async (data: { missionId: string; status?: MissionEnrichmentStatus; promptVersion?: string }): Promise<MissionEnrichment> => {
  return prisma.missionEnrichment.create({
    data: {
      missionId: data.missionId,
      status: data.status ?? "completed",
      promptVersion: data.promptVersion ?? CURRENT_PROMPT_VERSION,
    },
  });
};

export const createTestMissionScoring = async (data: {
  missionId: string;
  missionEnrichmentId: string;
  publish?: boolean;
  values?: Array<{ taxonomyKey: TaxonomyKey; valueKey: string; score?: number }>;
}): Promise<MissionScoring> => {
  const scoring = await prisma.missionScoring.create({
    data: {
      missionId: data.missionId,
      missionEnrichmentId: data.missionEnrichmentId,
    },
  });

  if (data.values?.length) {
    for (const v of data.values) {
      await prisma.missionScoringValue.create({
        data: {
          missionScoringId: scoring.id,
          taxonomyKey: v.taxonomyKey,
          valueKey: v.valueKey,
          score: v.score ?? 1.0,
        },
      });
    }
  }

  if (data.publish !== false) {
    await matchingCatalogRepository.rebuildBatch([scoring.id]);
  }
  return scoring;
};
