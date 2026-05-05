import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { asyncTaskBus } from "@/services/async-task";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";
import { PUBLISHER_SCORING_RULES } from "@/services/mission-scoring/publisher-rules";
import type { ComputedMissionScoringValue } from "@/services/mission-scoring/types";
import { parseTaxonomyValueKey } from "@engagement/taxonomy";

const LOG_PREFIX = "[mission-scoring]";

const parsePublisherRuleKey = (key: string): { taxonomyKey: string; valueKey: string } => {
  const parsedKey = parseTaxonomyValueKey(key);
  if (!parsedKey) {
    throw new Error(`[mission-scoring] invalid prefixed taxonomy key '${key}'`);
  }

  return parsedKey;
};

export const missionScoringService = {
  async enqueue(missionId: string, options: { force?: boolean } = {}): Promise<void> {
    await asyncTaskBus.publish({ type: "mission.scoring", payload: { missionId, ...(options.force !== undefined ? { force: options.force } : {}) } });
  },

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
    const publisherValues: ComputedMissionScoringValue[] = publisherRuleKeys.map((prefixedKey) => {
      const { taxonomyKey, valueKey } = parsePublisherRuleKey(prefixedKey);

      return {
        missionEnrichmentValueId: null,
        taxonomyKey,
        valueKey,
        score: 1.0,
      };
    });

    // Merge: start with enrichment values, publisher rules override on same taxonomy key
    const mergedValuesMap = new Map<string, ComputedMissionScoringValue>(result.values.map((value) => [`${value.taxonomyKey}.${value.valueKey}`, value] as const));
    for (const pv of publisherValues) {
      mergedValuesMap.set(`${pv.taxonomyKey}.${pv.valueKey}`, pv);
    }
    const allValues = Array.from(mergedValuesMap.values());

    if (allValues.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no scoring values produced`);
      return;
    }

    try {
      await missionScoringRepository.replaceForEnrichment({
        missionId: params.missionId,
        missionEnrichmentId: enrichmentId,
        values: allValues.map((value) => ({
          missionEnrichmentValueId: value.missionEnrichmentValueId,
          taxonomyKey: value.taxonomyKey,
          valueKey: value.valueKey,
          score: value.score,
        })),
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — lost race to concurrent scorer`);
        return;
      }
      throw error;
    }

    console.log(
      `${LOG_PREFIX} mission=${params.missionId} enrichment=${enrichmentId} completed — ${allValues.length} value(s) persisted (${result.values.length} enrichment + ${publisherValues.length} publisher rules), ${result.ignored.length} ignored`
    );
  },
};

export default missionScoringService;
