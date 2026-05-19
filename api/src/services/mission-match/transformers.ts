import type { MissionMatchItem, MissionMatchValue } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";

import type { MatchMissionItem } from "@/services/matching-engine/types";

export type MissionMatchDbRow = {
  id: string;
  title: string;
  remote: string | null;
  schedule: string | null;
  domainOriginal: string | null;
  domainLogo: string | null;
  domain: { name: string } | null;
  publisher: { name: string; logo: string | null; defaultMissionLogo: string | null } | null;
  publisherOrganization: { name: string | null; logo: string | null } | null;
  addresses: Array<{ city: string | null }>;
};

export type MissionScoringValueDbRow = {
  missionScoringId: string;
  taxonomyKey: string | null;
  valueKey: string | null;
  score: number;
  taxonomyValue: {
    key: string;
    label: string;
    taxonomy: { key: string };
  } | null;
  missionEnrichmentValue: {
    confidence: number;
    evidence: unknown;
  } | null;
};

type MissionIndexEntry = {
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

export const toMissionMatchItem = (item: MatchMissionItem, missionIndex: Record<string, MissionIndexEntry>, valuesIndex: Record<string, MissionMatchValue[]>): MissionMatchItem => {
  const mission = missionIndex[item.missionId];
  const photo = mission?.domainLogo ?? mission?.organizationLogo ?? mission?.publisherDefaultMissionLogo ?? mission?.publisherLogo ?? null;

  return {
    mission: {
      id: item.missionId,
      title: mission?.title ?? "(unknown)",
      remote: (mission?.remote ?? null) as "no" | "possible" | "full" | null,
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
      taxonomyScores: item.taxonomyScores as Record<string, number>,
      values: valuesIndex[item.missionScoringId] ?? [],
    },
  };
};
