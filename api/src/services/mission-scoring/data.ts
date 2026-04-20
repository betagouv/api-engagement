import { Prisma } from "@/db/core";

import type { ScoringInputValue } from "@/services/mission-scoring/types";

export const missionScoringEnrichmentInclude = {
  mission: { select: { publisherId: true } },
  values: {
    include: {
      taxonomyValue: {
        include: {
          taxonomy: {
            select: {
              key: true,
            },
          },
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
    taxonomyValueId: value.taxonomyValueId,
    taxonomyValueKey: value.taxonomyValue.key,
    confidence: value.confidence,
  }));
