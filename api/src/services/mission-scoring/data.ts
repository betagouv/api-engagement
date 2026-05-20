import { Prisma } from "@/db/core";

import type { ScoringInputValue } from "@/services/mission-scoring/types";

export const missionScoringEnrichmentInclude = {
  mission: { select: { publisherId: true, type: true } },
  values: true,
} satisfies Prisma.MissionEnrichmentInclude;

export type MissionEnrichmentForScoring = Prisma.MissionEnrichmentGetPayload<{
  include: typeof missionScoringEnrichmentInclude;
}>;

export const toScoringInputValues = (enrichment: MissionEnrichmentForScoring): ScoringInputValue[] =>
  enrichment.values
    .map((value) => ({
      missionEnrichmentValueId: value.id,
      taxonomyKey: value.taxonomyKey,
      valueKey: value.valueKey,
      confidence: value.confidence,
    }))
    .filter((value): value is ScoringInputValue => typeof value.taxonomyKey === "string" && typeof value.valueKey === "string");
