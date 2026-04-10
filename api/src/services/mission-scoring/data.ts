import { Prisma } from "@/db/core";

import type { ScoringInputValue } from "@/services/mission-scoring/types";

export const missionScoringEnrichmentInclude = {
  values: {
    include: {
      taxonomyValue: {
        include: {
          taxonomy: true,
        },
      },
    },
  },
} satisfies Prisma.MissionEnrichmentInclude;

export type MissionEnrichmentForScoring = Prisma.MissionEnrichmentGetPayload<{
  include: typeof missionScoringEnrichmentInclude;
}>;

export const toScoringInputValues = (enrichment: MissionEnrichmentForScoring): ScoringInputValue[] =>
  enrichment.values.map((value) => ({
    missionEnrichmentValueId: value.id,
    taxonomyKey: value.taxonomyValue.taxonomy.key,
    taxonomyType: value.taxonomyValue.taxonomy.type,
    taxonomyValueId: value.taxonomyValueId,
    taxonomyValueKey: value.taxonomyValue.key,
    order: value.taxonomyValue.order,
    confidence: value.confidence,
  }));
