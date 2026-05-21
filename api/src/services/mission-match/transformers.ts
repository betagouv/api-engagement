import type { MissionMatchItem, MissionMatchValue } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";

import type { Prisma } from "@/db/core";
import type { MatchMissionItem } from "@/services/matching-engine/types";

export const missionMatchMissionSelect = {
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
} satisfies Prisma.MissionSelect;

export type MissionMatchDbRow = Prisma.MissionGetPayload<{ select: typeof missionMatchMissionSelect }>;

export const missionMatchScoringValueSelect = {
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
} satisfies Prisma.MissionScoringValueSelect;

export type MissionScoringValueDbRow = Prisma.MissionScoringValueGetPayload<{ select: typeof missionMatchScoringValueSelect }>;

type MissionIndexEntry = {
  title: string;
  city: string | null;
  remote: MissionMatchDbRow["remote"];
  schedule: string | null;
  domain: string | null;
  domainOriginal: string | null;
  domainLogo: string | null;
  publisherName: string | null;
  publisherLogo: string | null;
  publisherDefaultMissionLogo: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
};

const getTaxonomyValueLabel = (taxonomyKey: string, valueKey: string): string | null => {
  const taxonomy = TAXONOMY[taxonomyKey as keyof typeof TAXONOMY] as { values: Record<string, { label: string }> } | undefined;
  if (!taxonomy) {
    return null;
  }
  return taxonomy.values[valueKey]?.label ?? null;
};

export const buildMissionIndex = (missionRows: MissionMatchDbRow[]): Record<string, MissionIndexEntry> => {
  const index: Record<string, MissionIndexEntry> = {};
  for (const m of missionRows) {
    index[m.id] = {
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
  return index;
};

export const buildValuesIndex = (scoringValueRows: MissionScoringValueDbRow[]): Record<string, MissionMatchValue[]> => {
  const index: Record<string, MissionMatchValue[]> = {};
  for (const row of scoringValueRows) {
    const taxonomyKey = row.taxonomyKey ?? row.taxonomyValue?.taxonomy.key ?? "unknown";
    const taxonomyValueKey = row.valueKey ?? row.taxonomyValue?.key ?? "unknown";
    const taxonomyValueLabel = row.taxonomyValue?.label ?? getTaxonomyValueLabel(taxonomyKey, taxonomyValueKey) ?? taxonomyValueKey;

    const entry: MissionMatchValue = {
      taxonomyKey,
      taxonomyValueKey,
      taxonomyValueLabel,
      enrichmentConfidence: row.missionEnrichmentValue?.confidence ?? 0,
      scoringScore: row.score,
      evidence: row.missionEnrichmentValue?.evidence ?? null,
    };
    (index[row.missionScoringId] ??= []).push(entry);
  }
  return index;
};

const toTaxonomyScoresDto = (taxonomyScores: MatchMissionItem["taxonomyScores"]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const [taxonomyKey, score] of Object.entries(taxonomyScores)) {
    if (score !== undefined) {
      result[taxonomyKey] = score;
    }
  }
  return result;
};

export const toMissionMatchItem = (item: MatchMissionItem, missionIndex: Record<string, MissionIndexEntry>, valuesIndex: Record<string, MissionMatchValue[]>): MissionMatchItem => {
  const mission = missionIndex[item.missionId];
  const photo = mission?.domainLogo ?? mission?.organizationLogo ?? mission?.publisherDefaultMissionLogo ?? mission?.publisherLogo ?? null;

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
      taxonomyScores: toTaxonomyScoresDto(item.taxonomyScores),
      values: valuesIndex[item.missionScoringId] ?? [],
    },
  };
};
