import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { taxonomyRepository } from "@/repositories/taxonomy";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";
import { PUBLISHER_SCORING_RULES } from "@/services/mission-scoring/publisher-rules";
import type { ComputedMissionScoringValue } from "@/services/mission-scoring/types";

const LOG_PREFIX = "[mission-scoring]";

const splitPrefixedKey = (key: string): { dimensionKey: string; valueKey: string } => {
  const dotIndex = key.indexOf(".");
  if (dotIndex <= 0 || dotIndex === key.length - 1) {
    throw new Error(`[mission-scoring] invalid prefixed taxonomy key '${key}'`);
  }

  return {
    dimensionKey: key.slice(0, dotIndex),
    valueKey: key.slice(dotIndex + 1),
  };
};

export const missionScoringService = {
  async score(params: { missionId: string; missionEnrichmentId?: string; force?: boolean }) {
    const enrichment = await missionEnrichmentRepository.findFirst({
      where: {
        ...(params.missionEnrichmentId ? { id: params.missionEnrichmentId } : {}),
        missionId: params.missionId,
        status: "completed",
      },
      orderBy: { createdAt: "desc" },
      include: missionScoringEnrichmentInclude,
    });

    if (!enrichment) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId ?? "latest"} — completed enrichment not found`);
      return;
    }

    const enrichmentId = enrichment.id;

    const existingScoring = await missionScoringRepository.findUnique({
      where: {
        missionId_missionEnrichmentId: {
          missionId: params.missionId,
          missionEnrichmentId: enrichmentId,
        },
      },
    });

    if (existingScoring && !params.force) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — scoring already exists`);
      return;
    }

    const hasPublisherRules = (PUBLISHER_SCORING_RULES[enrichment.mission.publisherId ?? ""]?.length ?? 0) > 0;
    if (enrichment.values.length === 0 && !hasPublisherRules && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no enrichment values and no publisher rules`);
      return;
    }

    const inputValues = toScoringInputValues(enrichment);
    const result = computeMissionScoringValues(inputValues);

    // Publisher rules: inject gate/publisher-specific values (bypass LLM enrichment)
    const publisherRuleKeys = PUBLISHER_SCORING_RULES[enrichment.mission.publisherId ?? ""] ?? [];
    const resolvedLegacyPublisherValues = await taxonomyRepository.findManyLegacyValuesByPrefixedKeys(publisherRuleKeys);
    const legacyPublisherValueIdsByPrefixedKey = new Map(
      resolvedLegacyPublisherValues.map((value) => [`${value.taxonomyKey}.${value.key}`, value.id] as const)
    );
    const publisherValues: ComputedMissionScoringValue[] = publisherRuleKeys.map((prefixedKey) => {
      const { dimensionKey, valueKey } = splitPrefixedKey(prefixedKey);

      return {
        missionEnrichmentValueId: null,
        dimensionKey,
        valueKey,
        taxonomyValueId: legacyPublisherValueIdsByPrefixedKey.get(prefixedKey) ?? null,
        score: 1.0,
      };
    });

    // Merge: start with enrichment values, publisher rules override on same taxonomy key
    const mergedValuesMap = new Map<string, ComputedMissionScoringValue>(
      result.values.map((value) => [`${value.dimensionKey}.${value.valueKey}`, value] as const)
    );
    for (const pv of publisherValues) {
      mergedValuesMap.set(`${pv.dimensionKey}.${pv.valueKey}`, pv);
    }
    const allValues = Array.from(mergedValuesMap.values());

    if (allValues.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no scoring values produced`);
      return;
    }

    await missionScoringRepository.replaceForEnrichment({
      missionId: params.missionId,
      missionEnrichmentId: enrichmentId,
      values: allValues.map((value) => ({
        missionEnrichmentValueId: value.missionEnrichmentValueId,
        dimensionKey: value.dimensionKey,
        valueKey: value.valueKey,
        taxonomyValueId: value.taxonomyValueId,
        score: value.score,
      })),
    });

    console.log(
      `${LOG_PREFIX} mission=${params.missionId} enrichment=${enrichmentId} completed — ${allValues.length} value(s) persisted (${result.values.length} enrichment + ${publisherValues.length} publisher rules), ${result.ignored.length} ignored`
    );
  },
};

export default missionScoringService;
