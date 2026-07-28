import { Prisma } from "@/db/core";

import { missionEnrichmentRepository } from "@/repositories/mission-enrichment";
import { missionScoringRepository } from "@/repositories/mission-scoring";
import { asyncTaskBus } from "@/services/async-task";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import { computeMissionScoringValues } from "@/services/mission-scoring/calculator";
import { missionScoringEnrichmentInclude, toScoringInputValues } from "@/services/mission-scoring/data";
import { resolveMissionScoringRules } from "@/services/mission-scoring/scoring-rules";
import type { ComputedMissionScoringValue } from "@/services/mission-scoring/types";
import { parseTaxonomyValueKey } from "@engagement/taxonomy";

const LOG_PREFIX = "[mission-scoring]";

const parseScoringRuleKey = (key: string): { taxonomyKey: string; valueKey: string } => {
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
    // Sélection de l'enrichment à scorer :
    // - id explicite fourni → ciblage exact (comportement inchangé) ;
    // - sinon on privilégie la version de prompt active, avec repli sur le dernier enrichment
    //   `completed` (toutes versions) pour ne pas laisser une mission non scorée quand elle n'a pas
    //   encore été enrichie dans la version active.
    const completedWhere = {
      ...(params.missionEnrichmentId ? { id: params.missionEnrichmentId } : {}),
      missionId: params.missionId,
      status: "completed",
    } satisfies Prisma.MissionEnrichmentWhereInput;

    let enrichment = await missionEnrichmentRepository.findFirst({
      where: params.missionEnrichmentId ? completedWhere : { ...completedWhere, promptVersion: CURRENT_PROMPT_VERSION },
      orderBy: { createdAt: "desc" },
      include: missionScoringEnrichmentInclude,
    });

    if (!enrichment && !params.missionEnrichmentId) {
      enrichment = await missionEnrichmentRepository.findFirst({
        where: completedWhere,
        orderBy: { createdAt: "desc" },
        include: missionScoringEnrichmentInclude,
      });
    }

    if (!enrichment) {
      console.log(
        `${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${params.missionEnrichmentId ?? `${CURRENT_PROMPT_VERSION}|latest`} — completed enrichment not found`
      );
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

    const resolvedMissionRules = resolveMissionScoringRules(enrichment.mission);
    const missionRuleKeys = resolvedMissionRules.keys;
    if (enrichment.values.length === 0 && missionRuleKeys.length === 0 && !existingScoring) {
      console.log(`${LOG_PREFIX} skipping mission=${params.missionId} enrichment=${enrichmentId} — no enrichment values and no mission rules`);
      return;
    }

    const inputValues = toScoringInputValues(enrichment);
    const result = computeMissionScoringValues(inputValues);

    // Mission rules: inject gate/specific values (bypass LLM enrichment)
    const missionRuleValues: ComputedMissionScoringValue[] = missionRuleKeys.map((prefixedKey) => {
      const { taxonomyKey, valueKey } = parseScoringRuleKey(prefixedKey);

      return {
        missionEnrichmentValueId: null,
        taxonomyKey,
        valueKey,
        score: 1.0,
      };
    });

    // Taxonomies covered by deterministic rules — LLM values for these are replaced entirely.
    const enrichmentValues = result.values.filter((v) => !resolvedMissionRules.replacedTaxonomyKeys.has(v.taxonomyKey));

    // Merge: enrichment values (minus rule-covered taxonomies) + rule values.
    const mergedValuesMap = new Map<string, ComputedMissionScoringValue>(enrichmentValues.map((value) => [`${value.taxonomyKey}.${value.valueKey}`, value] as const));
    for (const pv of missionRuleValues) {
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
      `${LOG_PREFIX} mission=${params.missionId} enrichment=${enrichmentId} completed — ${allValues.length} value(s) persisted (${result.values.length} enrichment + ${missionRuleValues.length} mission rules), ${result.ignored.length} ignored`
    );
  },
};

export default missionScoringService;
